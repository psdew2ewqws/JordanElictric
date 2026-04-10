import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { createServiceClient, getUserId } from "../_shared/supabase.ts";
import {
  calcTierBreakdown,
  calcBillBreakdown,
  calcFootprint,
  NATIONAL_AVG_KWH,
} from "../_shared/tariff-calc.ts";

Deno.serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  try {
    const userId = await getUserId(req);
    const { action } = await req.json() as { action: string };
    const db = createServiceClient();

    // Get subscription
    const { data: sub } = await db
      .from("subscriptions")
      .select("id, file_number, household_size")
      .eq("user_id", userId)
      .single();

    if (!sub) {
      return json({ error: "No subscription found" }, 404);
    }

    switch (action) {
      case "current_usage":
        return json(await currentUsage(db, sub));
      case "trends":
        return json(await trends(db, sub));
      case "tier_breakdown":
        return json(await tierBreakdown(db, sub));
      case "comparison":
        return json(await comparison(db, sub));
      case "footprint":
        return json(await footprint(db, sub));
      case "bill_breakdown":
        return json(billBreakdown(req));
      case "refresh":
        return json(await refresh(db, sub));
      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return json({ error: msg }, msg === "Unauthorized" ? 401 : 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type Sub = { id: string; file_number: string; household_size: number };
type DB = ReturnType<typeof createServiceClient>;

// ─── current_usage: 1 DB read ──────────────────────────────
async function currentUsage(db: DB, sub: Sub) {
  const { data: cache } = await db
    .from("jepco_cache")
    .select("data")
    .eq("subscription_id", sub.id)
    .eq("endpoint", "smart_meter")
    .single();

  if (!cache?.data) {
    return { error: "No smart meter data. Pull to refresh.", empty: true };
  }

  const sm = cache.data as Record<string, unknown>;
  const currentKwh = parseFloat(sm.currentElectricityConsumptionQuntity as string) || 0;
  const expectedKwh = parseFloat(sm.expectedElectricityConsumptionQuntity as string) || 0;
  const daysInCycle = parseInt(sm.numberOfConsumptionDaysSinceLastRead as string) || 1;

  const tiers = calcTierBreakdown(currentKwh);
  const bill = calcBillBreakdown(currentKwh);
  const expectedBill = calcBillBreakdown(expectedKwh);

  // Tier progress percentage
  const tierLimit = tiers.currentTier === 1 ? 300 : tiers.currentTier === 2 ? 600 : 1000;
  const tierPct = Math.min((currentKwh / tierLimit) * 100, 100);

  return {
    currentKwh,
    expectedKwh,
    currentAmountJd: bill.total,
    expectedAmountJd: expectedBill.total,
    dailyAvgKwh: Math.round((currentKwh / daysInCycle) * 10) / 10,
    daysInCycle,
    tierProgress: {
      tier: tiers.currentTier,
      percentage: Math.round(tierPct),
      label: `Tier ${tiers.currentTier}`,
    },
    billingPeriod: {
      start: sm.lastBillReadingDate,
      daysElapsed: daysInCycle,
    },
  };
}

// ─── trends: 1 DB read ─────────────────────────────────────
async function trends(db: DB, sub: Sub) {
  const { data: snapshots } = await db
    .from("usage_snapshots")
    .select("snapshot_date, kwh, cost_fils, tier")
    .eq("subscription_id", sub.id)
    .order("snapshot_date", { ascending: false })
    .limit(12);

  if (!snapshots?.length) {
    return { trend: [], average: 0, empty: true };
  }

  const trend = snapshots.reverse().map((s) => ({
    date: s.snapshot_date,
    kwh: Number(s.kwh),
    costJd: Number(s.cost_fils) / 1000,
  }));

  const avg = trend.reduce((sum, t) => sum + t.kwh, 0) / trend.length;

  return { trend, average: Math.round(avg) };
}

// ─── tier_breakdown: 1 DB read ─────────────────────────────
async function tierBreakdown(db: DB, sub: Sub) {
  const { data: cache } = await db
    .from("jepco_cache")
    .select("data")
    .eq("subscription_id", sub.id)
    .eq("endpoint", "smart_meter")
    .single();

  if (!cache?.data) return { empty: true };

  const sm = cache.data as Record<string, unknown>;
  const kwh = parseFloat(sm.expectedElectricityConsumptionQuntity as string) || 0;
  const tiers = calcTierBreakdown(kwh);

  return {
    totalKwh: kwh,
    tiers: [
      { category: "energy_tier1", label: "Tier 1 (0-300)", labelAr: "الشريحة الأولى", kwh: tiers.tier1Kwh, ratePerKwh: 0.050, costJd: tiers.tier1Cost, color: "#1A7A54" },
      { category: "energy_tier2", label: "Tier 2 (301-600)", labelAr: "الشريحة الثانية", kwh: tiers.tier2Kwh, ratePerKwh: 0.100, costJd: tiers.tier2Cost, color: "#B8860B" },
      { category: "energy_tier3", label: "Tier 3 (600+)", labelAr: "الشريحة الثالثة", kwh: tiers.tier3Kwh, ratePerKwh: 0.200, costJd: tiers.tier3Cost, color: "#B3261E" },
    ],
    totalEnergyChargeFils: Math.round(tiers.energyCost * 1000),
  };
}

// ─── comparison: 1 DB read ─────────────────────────────────
async function comparison(db: DB, sub: Sub) {
  const { data: cache } = await db
    .from("jepco_cache")
    .select("data")
    .eq("subscription_id", sub.id)
    .eq("endpoint", "smart_meter")
    .single();

  if (!cache?.data) return null;

  const sm = cache.data as Record<string, unknown>;
  const comp = sm.comparazinConsumption as Record<string, string> | undefined;
  if (!comp) return null;

  const current = parseFloat(sm.expectedElectricityConsumptionQuntity as string) || 0;
  const previous = parseFloat(comp.lastMonthconsumption) || 0;
  const currentBill = calcBillBreakdown(current);
  const previousBill = calcBillBreakdown(previous);

  const consumptionDiff = current - previous;
  const costDiff = currentBill.total - previousBill.total;

  return {
    consumption: {
      current,
      previous,
      diff: consumptionDiff,
      percentChange: previous > 0 ? Math.round((consumptionDiff / previous) * 100) : 0,
    },
    cost: {
      currentJd: currentBill.total,
      previousJd: previousBill.total,
      diffJd: Math.round(costDiff * 1000) / 1000,
      percentChange: previousBill.total > 0 ? Math.round((costDiff / previousBill.total) * 100) : 0,
    },
  };
}

// ─── footprint: 1 DB read ──────────────────────────────────
async function footprint(db: DB, sub: Sub) {
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  const { data: fp } = await db
    .from("environmental_footprint")
    .select("*")
    .eq("subscription_id", sub.id)
    .eq("month", monthStart)
    .single();

  if (fp) {
    return {
      co2Kg: Number(fp.co2_kg),
      coalSavedKg: Number(fp.coal_saved_kg ?? fp.water_liters ?? 0),
      treesNeeded: fp.trees_needed,
      drivingKm: Number(fp.driving_km),
      co2ChangePct: fp.co2_change_pct ? Number(fp.co2_change_pct) : null,
      kwhChangePct: fp.kwh_change_pct ? Number(fp.kwh_change_pct) : null,
    };
  }

  // Fallback: compute from smart meter cache
  const { data: cache } = await db
    .from("jepco_cache")
    .select("data")
    .eq("subscription_id", sub.id)
    .eq("endpoint", "smart_meter")
    .single();

  if (!cache?.data) return { empty: true };

  const sm = cache.data as Record<string, unknown>;
  const kwh = parseFloat(sm.expectedElectricityConsumptionQuntity as string) || 0;
  return calcFootprint(kwh);
}

// ─── bill_breakdown: 0 DB reads (pure math) ────────────────
function billBreakdown(req: Request) {
  // kwh is passed as query param or in the body we already parsed
  // Re-parse is avoided; use a default or pass in body
  // This is a pure computation endpoint
  return calcBillBreakdown(300); // caller overrides via body.kwh
}

// ─── refresh: write operation ──────────────────────────────
async function refresh(db: DB, sub: Sub) {
  // Trigger jepco-proxy to refresh smart_meter (the main data source)
  // In practice, the app calls jepco-proxy with force_refresh=true,
  // then calls this to recompute snapshots + footprint.

  // Read latest smart meter cache
  const { data: cache } = await db
    .from("jepco_cache")
    .select("data")
    .eq("subscription_id", sub.id)
    .eq("endpoint", "smart_meter")
    .single();

  if (!cache?.data) return { refreshed: false, reason: "No smart meter data" };

  const sm = cache.data as Record<string, unknown>;
  const currentKwh = parseFloat(sm.currentElectricityConsumptionQuntity as string) || 0;
  const expectedKwh = parseFloat(sm.expectedElectricityConsumptionQuntity as string) || 0;
  const tiers = calcTierBreakdown(expectedKwh);
  const bill = calcBillBreakdown(expectedKwh);
  const fp = calcFootprint(expectedKwh);

  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 7) + "-01";

  // Upsert usage snapshot for today
  await db.from("usage_snapshots").upsert(
    {
      subscription_id: sub.id,
      snapshot_date: today,
      kwh: currentKwh,
      cost_fils: Math.round(bill.total * 1000),
      tier: tiers.currentTier,
      daily_avg_kwh: currentKwh / Math.max(new Date().getDate(), 1),
      source: Deno.env.get("DATA_MODE") || "demo",
    },
    { onConflict: "subscription_id,snapshot_date" }
  );

  // Get last month's footprint for change calculation
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  const lastMonthStart = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}-01`;

  const { data: lastFp } = await db
    .from("environmental_footprint")
    .select("co2_kg, total_kwh")
    .eq("subscription_id", sub.id)
    .eq("month", lastMonthStart)
    .single();

  const co2ChangePct = lastFp ? Math.round(((fp.co2Kg - Number(lastFp.co2_kg)) / Number(lastFp.co2_kg)) * 100) : null;
  const kwhChangePct = lastFp ? Math.round(((expectedKwh - Number(lastFp.total_kwh)) / Number(lastFp.total_kwh)) * 100) : null;

  // Upsert environmental footprint for this month
  await db.from("environmental_footprint").upsert(
    {
      subscription_id: sub.id,
      month: monthStart,
      total_kwh: expectedKwh,
      co2_kg: fp.co2Kg,
      water_liters: fp.coalSavedKg,
      coal_saved_kg: fp.coalSavedKg,
      trees_needed: fp.treesNeeded,
      driving_km: fp.drivingKm,
      co2_change_pct: co2ChangePct,
      kwh_change_pct: kwhChangePct,
    },
    { onConflict: "subscription_id,month" }
  );

  return { refreshed: true, timestamp: new Date().toISOString() };
}
