import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import { getEmbedding } from "../_shared/ai-clients.ts";

Deno.serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  try {
    const { query, limit = 3 } = await req.json();
    if (!query) {
      return new Response(
        JSON.stringify({ error: "query is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get embedding for the query
    const embedding = await getEmbedding(query);
    const db = createServiceClient();

    // Vector similarity search using pgvector
    const { data: docs, error } = await db.rpc("match_knowledge_docs", {
      query_embedding: embedding,
      match_count: limit,
    });

    if (error) {
      // Fallback: if RPC doesn't exist yet, return empty
      return new Response(
        JSON.stringify({ context: "", sources: [], fallback: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format context string
    const context = (docs || [])
      .map(
        (d: any, i: number) =>
          `[${i + 1}] (${d.source_file} — ${d.section_title})\n${d.content}`
      )
      .join("\n\n");

    const sources = (docs || []).map((d: any) => ({
      file: d.source_file,
      section: d.section_title,
      similarity: d.similarity,
    }));

    return new Response(
      JSON.stringify({ context, sources }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
