import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { createServiceClient, getUserId } from "../_shared/supabase.ts";
import { getDemoData } from "../_shared/demo-data.ts";
import { fetchJepcoData } from "../_shared/jepco-client.ts";

const VALID_ENDPOINTS = [
  "smart_meter", "sap_info", "bills", "comparison",
  "bill_header", "statement", "simulate",
] as const;

type Endpoint = (typeof VALID_ENDPOINTS)[number];

// Cache TTL per endpoint (milliseconds)
const CACHE_TTL: Record<Endpoint, number> = {
  smart_meter: 60 * 60 * 1000,       // 1 hour
  bills: 6 * 60 * 60 * 1000,         // 6 hours
  comparison: 6 * 60 * 60 * 1000,    // 6 hours
  bill_header: 6 * 60 * 60 * 1000,   // 6 hours
  statement: 12 * 60 * 60 * 1000,    // 12 hours
  sap_info: 24 * 60 * 60 * 1000,     // 24 hours
  simulate: 60 * 60 * 1000,          // 1 hour
};

Deno.serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  try {
    const userId = await getUserId(req);
    const { action, force_refresh } = await req.json() as {
      action: string;
      force_refresh?: boolean;
    };

    if (!VALID_ENDPOINTS.includes(action as Endpoint)) {
      return new Response(
        JSON.stringify({ error: `Invalid action: ${action}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const endpoint = action as Endpoint;
    const db = createServiceClient();

    // Get user's subscription
    const { data: sub, error: subErr } = await db
      .from("subscriptions")
      .select("id, file_number, household_size, distribution_company")
      .eq("user_id", userId)
      .single();

    if (subErr || !sub) {
      return new Response(
        JSON.stringify({ error: "No subscription found. Link your JEPCO number first." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check cache (unless force_refresh)
    if (!force_refresh) {
      const { data: cached } = await db
        .from("jepco_cache")
        .select("data, expires_at")
        .eq("subscription_id", sub.id)
        .eq("endpoint", endpoint)
        .single();

      if (cached && new Date(cached.expires_at) > new Date()) {
        return new Response(
          JSON.stringify({
            fileNumber: sub.file_number,
            data: cached.data,
            source: "cache",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Fetch data (DEMO or LIVE)
    const dataMode = Deno.env.get("DATA_MODE") || "demo";
    let data: unknown;

    if (dataMode === "demo") {
      data = getDemoData(endpoint, sub.file_number, sub.household_size);
    } else {
      data = await fetchJepcoData(endpoint, sub.file_number);
    }

    // Upsert into cache
    const expiresAt = new Date(Date.now() + CACHE_TTL[endpoint]).toISOString();
    await db
      .from("jepco_cache")
      .upsert(
        {
          subscription_id: sub.id,
          endpoint,
          data,
          fetched_at: new Date().toISOString(),
          expires_at: expiresAt,
        },
        { onConflict: "subscription_id,endpoint" }
      );

    return new Response(
      JSON.stringify({
        fileNumber: sub.file_number,
        data,
        source: dataMode,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    const status = msg === "Unauthorized" ? 401 : 500;
    return new Response(
      JSON.stringify({ error: msg }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
