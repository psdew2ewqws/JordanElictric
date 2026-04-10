/**
 * Chat Tool Definitions + Executors for Claude tool_use.
 * Each tool has an Anthropic-format JSON schema and an async executor.
 */

import { calcTierBreakdown, calcBillBreakdown, calcFootprint, NATIONAL_AVG_KWH } from "./tariff-calc.ts";
import { getEmbedding } from "./ai-clients.ts";
import { fetchJepcoData } from "./jepco-client.ts";
import { getDemoData } from "./demo-data.ts";

// ─── Types ────────────────────────────────────────────────

type DB = ReturnType<any>; // Supabase client

export interface ToolContext {
  db: DB;
  userId: string;
  subscriptionId: string | null;
  fileNumber: string | null;
}

export interface ToolDef {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

// ─── Tool Definitions (Anthropic format) ──────────────────

export const TOOL_DEFINITIONS: ToolDef[] = [
  {
    name: "get_current_usage",
    description:
      "Get the user's current electricity consumption from their smart meter. " +
      "Returns: current kWh used this cycle, expected end-of-month kWh, daily consumption breakdown, " +
      "days elapsed, comparison with last month and last year. " +
      "Use when the user asks about their current usage, why their bill is high, or anything about this month's consumption.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_bill_history",
    description:
      "Get the user's billing history (last 6 months). " +
      "Returns: list of bills with billing period, kWh consumed, total amount in JD, and payment status. " +
      "Use when the user asks about past bills, wants to compare months, or asks why their bill changed.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_account_info",
    description:
      "Get the user's subscriber info from JEPCO. " +
      "Returns: subscriber name, file number, meter number, subscription type, outstanding balance, office. " +
      "Use when the user asks about their account details, meter info, or balance owed.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "calculate_bill",
    description:
      "Calculate what a bill would be for a specific kWh amount using the official EMRC tariff. " +
      "Returns: full bill breakdown (tier 1/2/3 costs, municipality tax, TV license, meter rent, rural fee, subsidy, total). " +
      "Use when the user asks 'what if I used X kWh?', wants to understand tariff math, or asks about a specific consumption level.",
    input_schema: {
      type: "object",
      properties: {
        kwh: { type: "number", description: "The kWh amount to calculate the bill for" },
      },
      required: ["kwh"],
    },
  },
  {
    name: "search_knowledge",
    description:
      "Search the knowledge base for information about Jordan's electricity system. " +
      "Covers: EMRC tariff regulations, JEPCO procedures, savings tips, solar/renewables, " +
      "bill anatomy, appliance consumption profiles, environmental impact, contact info, complaint procedures. " +
      "Use when the user asks factual questions about electricity in Jordan, regulations, tips, or procedures.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "The search query in Arabic or English" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_footprint",
    description:
      "Get the user's environmental footprint based on their electricity consumption. " +
      "Returns: CO2 emissions (kg), water used (liters), trees needed to offset, equivalent driving distance (km). " +
      "Use when the user asks about environmental impact, carbon footprint, or sustainability.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "file_complaint",
    description:
      "File an official complaint on behalf of the user. " +
      "IMPORTANT: Always confirm the complaint type and description with the user BEFORE calling this tool. " +
      "Read back what you understood and ask 'Should I submit this?' before proceeding. " +
      "Types: OUTAGE (power cut), BILLING (bill dispute), METER (meter issue), VOLTAGE (voltage problem), OTHER.",
    input_schema: {
      type: "object",
      properties: {
        complaint_type: {
          type: "string",
          enum: ["OUTAGE", "BILLING", "METER", "VOLTAGE", "OTHER"],
          description: "The type of complaint",
        },
        description: { type: "string", description: "Detailed description of the complaint" },
      },
      required: ["complaint_type", "description"],
    },
  },
  {
    name: "get_complaints",
    description:
      "Get the user's complaint history and status. " +
      "Returns: list of complaints with reference number, type, status, and date. " +
      "Use when the user asks about complaint status or previous complaints.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
];

// ─── Tool Executor ────────────────────────────────────────

export async function executeTool(
  toolName: string,
  input: Record<string, unknown>,
  ctx: ToolContext,
): Promise<string> {
  switch (toolName) {
    case "get_current_usage":
      return execGetCurrentUsage(ctx);
    case "get_bill_history":
      return execGetBillHistory(ctx);
    case "get_account_info":
      return execGetAccountInfo(ctx);
    case "calculate_bill":
      return execCalculateBill(input);
    case "search_knowledge":
      return execSearchKnowledge(ctx, input);
    case "get_footprint":
      return execGetFootprint(ctx);
    case "file_complaint":
      return execFileComplaint(ctx, input);
    case "get_complaints":
      return execGetComplaints(ctx);
    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }
}

// ─── Cache-or-fetch helper ────────────────────────────────

/**
 * Reads from jepco_cache. If empty/expired, fetches fresh data
 * from JEPCO (live) or demo generator, caches it, and returns it.
 */
async function getOrFetchCache(
  ctx: ToolContext,
  endpoint: string,
): Promise<Record<string, unknown> | null> {
  if (!ctx.subscriptionId) return null;

  // 1. Try cache
  const { data: cached } = await ctx.db
    .from("jepco_cache")
    .select("data, expires_at")
    .eq("subscription_id", ctx.subscriptionId)
    .eq("endpoint", endpoint)
    .single();

  if (cached?.data && new Date(cached.expires_at) > new Date()) {
    console.log(`[chat-tool] Cache HIT for ${endpoint}`);
    // JEPCO live data is cached as { statusCode, body: {...} } — unwrap
    const raw = cached.data as Record<string, unknown>;
    return (raw.body && typeof raw.body === "object") ? raw.body as Record<string, unknown> : raw;
  }

  // 2. Cache miss — fetch fresh
  console.log(`[chat-tool] Cache MISS for ${endpoint}, fetching...`);
  if (!ctx.fileNumber) return null;

  let freshData: unknown = null;
  const dataMode = Deno.env.get("DATA_MODE") || "demo";

  try {
    if (dataMode === "live") {
      const raw = await fetchJepcoData(endpoint, ctx.fileNumber);
      freshData = raw;
    } else {
      // Get household_size for demo generator
      const { data: sub } = await ctx.db
        .from("subscriptions")
        .select("household_size")
        .eq("id", ctx.subscriptionId)
        .single();
      freshData = getDemoData(endpoint, ctx.fileNumber, sub?.household_size || 4);
    }
  } catch (err) {
    console.error(`[chat-tool] Fetch failed for ${endpoint}:`, err);
    return null;
  }

  if (!freshData) return null;

  // 3. Cache it (1hr for smart_meter, 6hr for others)
  const ttl = endpoint === "smart_meter" ? 3600_000 : 6 * 3600_000;
  const expiresAt = new Date(Date.now() + ttl).toISOString();
  await ctx.db.from("jepco_cache").upsert({
    subscription_id: ctx.subscriptionId,
    endpoint,
    data: freshData,
    fetched_at: new Date().toISOString(),
    expires_at: expiresAt,
  }, { onConflict: "subscription_id,endpoint" });

  console.log(`[chat-tool] Cached fresh ${endpoint} data`);
  // Unwrap .body if JEPCO live response
  const result = freshData as Record<string, unknown>;
  return (result.body && typeof result.body === "object") ? result.body as Record<string, unknown> : result;
}

// ─── Executors ────────────────────────────────────────────

async function execGetCurrentUsage(ctx: ToolContext): Promise<string> {
  if (!ctx.subscriptionId) return JSON.stringify({ error: "No subscription linked. Ask the user to link their JEPCO number in Settings." });

  const sm = await getOrFetchCache(ctx, "smart_meter");
  if (!sm) return JSON.stringify({ error: "Could not retrieve smart meter data. The JEPCO service may be temporarily unavailable." });

  const currentKwh = Number(sm.currentElectricityConsumptionQuntity || 0);
  const expectedKwh = Number(sm.expectedElectricityConsumptionQuntity || 0);
  const comp = (sm.comparazinConsumption || {}) as Record<string, string>;
  const tiers = calcTierBreakdown(expectedKwh);
  const bill = calcBillBreakdown(expectedKwh);

  console.log(`[chat-tool] get_current_usage: current=${currentKwh}, expected=${expectedKwh}, tier=${tiers.currentTier}`);

  return JSON.stringify({
    current_kwh: currentKwh,
    expected_end_of_month_kwh: expectedKwh,
    days_elapsed: Number(sm.numberOfConsumptionDaysSinceLastRead || 0),
    daily_avg_kwh: +(currentKwh / Math.max(Number(sm.numberOfConsumptionDaysSinceLastRead || 1), 1)).toFixed(1),
    current_tier: tiers.currentTier,
    expected_bill_jd: +bill.total.toFixed(2),
    last_month_kwh: Number(comp.lastMonthconsumption || 0),
    last_year_kwh: Number(comp.lastYearconsumption || 0),
    national_avg_kwh: NATIONAL_AVG_KWH,
    last_reading: sm.lastBillReading,
    current_reading: sm.currentReading,
  });
}

async function execGetBillHistory(ctx: ToolContext): Promise<string> {
  if (!ctx.subscriptionId) return JSON.stringify({ error: "No subscription linked. Ask the user to link their JEPCO number in Settings." });

  const raw = await getOrFetchCache(ctx, "bills");
  if (!raw) return JSON.stringify({ error: "Could not retrieve bill history. The JEPCO service may be temporarily unavailable." });

  // JEPCO bills endpoint returns an array — take last 6
  const billsArr = Array.isArray(raw) ? raw : (raw as any).bills || [];
  const bills = billsArr.slice(0, 6);
  const summary = bills.map((b: any) => ({
    period: b.billDate || b.period || "unknown",
    kwh: Number(b.consumptionQuantity || b.kwh || 0),
    amount_jd: +(Number(b.totalAmount || b.amount || 0)).toFixed(2),
    paid: b.isPaid ?? b.paid ?? null,
  }));

  console.log(`[chat-tool] get_bill_history: ${summary.length} bills`);
  return JSON.stringify({ bills: summary, count: summary.length });
}

async function execGetAccountInfo(ctx: ToolContext): Promise<string> {
  if (!ctx.subscriptionId) return JSON.stringify({ error: "No subscription linked. Ask the user to link their JEPCO number in Settings." });

  // Get SAP info (with auto-fetch on cache miss)
  const sapData = await getOrFetchCache(ctx, "sap_info");

  // Get subscription record
  const { data: sub } = await ctx.db
    .from("subscriptions")
    .select("file_number, distribution_company, household_size")
    .eq("id", ctx.subscriptionId)
    .single();

  const sap = (sapData || {}) as Record<string, unknown>;

  return JSON.stringify({
    file_number: sub?.file_number || ctx.fileNumber,
    subscriber_name: sap.firstName ? `${sap.firstName} ${sap.familyName || ""}`.trim() : null,
    meter_number: sap.meterNumber || null,
    subscription_type: sap.subscriptionType || null,
    outstanding_balance_jd: sap.receivableAmount ? +(Number(sap.receivableAmount) / 1000).toFixed(2) : null,
    company: sub?.distribution_company || null,
    household_size: sub?.household_size || null,
  });
}

function execCalculateBill(input: Record<string, unknown>): string {
  const kwh = Number(input.kwh || 0);
  if (kwh <= 0 || kwh > 50000) return JSON.stringify({ error: "kWh must be between 1 and 50,000" });

  const tiers = calcTierBreakdown(kwh);
  const bill = calcBillBreakdown(kwh);
  const footprint = calcFootprint(kwh);

  return JSON.stringify({
    kwh,
    tier: tiers.currentTier,
    tier_breakdown: {
      tier1: { kwh: tiers.tier1Kwh, cost_jd: +tiers.tier1Cost.toFixed(3), rate: "0.050 JD/kWh" },
      tier2: tiers.tier2Kwh > 0 ? { kwh: tiers.tier2Kwh, cost_jd: +tiers.tier2Cost.toFixed(3), rate: "0.100 JD/kWh" } : null,
      tier3: tiers.tier3Kwh > 0 ? { kwh: tiers.tier3Kwh, cost_jd: +tiers.tier3Cost.toFixed(3), rate: "0.200 JD/kWh" } : null,
    },
    energy_cost_jd: +bill.energyCost.toFixed(3),
    municipality_tax_jd: +bill.municipalityTax.toFixed(3),
    tv_license_jd: bill.tvLicense,
    meter_rent_jd: bill.meterRent,
    rural_fee_jd: +bill.ruralFee.toFixed(3),
    subsidy_jd: bill.subsidy,
    total_jd: +bill.total.toFixed(2),
    co2_kg: +footprint.co2Kg.toFixed(1),
  });
}

async function execSearchKnowledge(ctx: ToolContext, input: Record<string, unknown>): Promise<string> {
  const query = String(input.query || "");
  if (!query) return JSON.stringify({ error: "query is required" });

  try {
    const embedding = await getEmbedding(query);
    const { data: docs } = await ctx.db.rpc("match_knowledge_docs", {
      query_embedding: embedding,
      match_count: 5,
    });

    if (!docs?.length) return JSON.stringify({ results: [], message: "No matching documents found" });

    return JSON.stringify({
      results: docs.map((d: any) => ({
        source: d.source_file,
        section: d.section_title,
        content: d.content?.substring(0, 800) || "",
        similarity: +(d.similarity || 0).toFixed(3),
      })),
    });
  } catch {
    return JSON.stringify({ error: "Knowledge search unavailable" });
  }
}

async function execGetFootprint(ctx: ToolContext): Promise<string> {
  if (!ctx.subscriptionId) return JSON.stringify({ error: "No subscription linked" });

  // Try cached footprint first
  const { data: fp } = await ctx.db
    .from("environmental_footprint")
    .select("*")
    .eq("subscription_id", ctx.subscriptionId)
    .order("month", { ascending: false })
    .limit(1)
    .single();

  if (fp) {
    return JSON.stringify({
      month: fp.month,
      co2_kg: fp.co2_kg,
      coal_saved_kg: fp.coal_saved_kg ?? fp.water_liters,
      trees_needed: fp.trees_needed,
      driving_km: fp.driving_km_equivalent,
      yoy_change_pct: fp.yoy_change_pct,
    });
  }

  // Fall back to calculating from smart meter
  const { data: smCache } = await ctx.db
    .from("jepco_cache")
    .select("data")
    .eq("subscription_id", ctx.subscriptionId)
    .eq("endpoint", "smart_meter")
    .single();

  if (smCache?.data) {
    const kwh = Number((smCache.data as Record<string, string>).expectedElectricityConsumptionQuntity || 0);
    const f = calcFootprint(kwh);
    return JSON.stringify({
      month: new Date().toISOString().slice(0, 7),
      co2_kg: +f.co2Kg.toFixed(1),
      coal_saved_kg: f.coalSavedKg,
      trees_needed: f.treesNeeded,
      driving_km: f.drivingKm,
    });
  }

  return JSON.stringify({ error: "No consumption data available" });
}

async function execFileComplaint(ctx: ToolContext, input: Record<string, unknown>): Promise<string> {
  const complaintType = String(input.complaint_type || "OTHER");
  const description = String(input.description || "");

  if (!description) return JSON.stringify({ error: "Description is required" });

  const { data, error } = await ctx.db
    .from("complaints")
    .insert({
      user_id: ctx.userId,
      complaint_type: complaintType,
      description,
      source: "chatbot",
    })
    .select("id, reference_number, complaint_type, status")
    .single();

  if (error) return JSON.stringify({ error: "Failed to create complaint" });

  return JSON.stringify({
    success: true,
    reference_number: data.reference_number,
    type: data.complaint_type,
    status: data.status,
    message: "Complaint filed successfully",
  });
}

async function execGetComplaints(ctx: ToolContext): Promise<string> {
  const { data } = await ctx.db
    .from("complaints")
    .select("reference_number, complaint_type, status, description, created_at")
    .eq("user_id", ctx.userId)
    .order("created_at", { ascending: false })
    .limit(5);

  if (!data?.length) return JSON.stringify({ complaints: [], message: "No complaints found" });

  return JSON.stringify({
    complaints: data.map((c: any) => ({
      ref: c.reference_number,
      type: c.complaint_type,
      status: c.status,
      description: c.description?.substring(0, 100),
      date: c.created_at?.slice(0, 10),
    })),
  });
}
