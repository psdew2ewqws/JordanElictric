import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { createServiceClient, getUserId } from "../_shared/supabase.ts";
import { classifyIntent, parseComplaintType, isConfirmation } from "../_shared/intent.ts";
import {
  SYSTEM_PROMPT_AR, SYSTEM_PROMPT_EN,
  CONSUMER_QA_PROMPT_AR, BILLING_PROMPT_AR, SAVINGS_PROMPT_AR,
  COMPLAINT_PROMPTS,
} from "../_shared/prompts.ts";
import { claudeStream, parseClaudeStream, getEmbedding } from "../_shared/ai-clients.ts";
import { validateResponse } from "../_shared/validators.ts";
import { calcTierBreakdown, calcBillBreakdown } from "../_shared/tariff-calc.ts";

Deno.serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  try {
    const userId = await getUserId(req);
    const { message, session_id } = await req.json();
    if (!message) {
      return jsonRes({ error: "message is required" }, 400);
    }

    const db = createServiceClient();
    const lang = await getUserLang(db, userId);

    // ── Step 1: Get or create session ──
    let session = session_id
      ? await getSession(db, session_id, userId)
      : await getActiveSession(db, userId);

    if (!session) {
      session = await createSession(db, userId, lang);
    }

    const ctx = (session.context || {}) as SessionContext;

    // ── Step 2: Save user message ──
    await db.from("chat_messages").insert({
      session_id: session.id,
      role: "user",
      content: message,
      message_type: "text",
    });

    // ── Step 3: Check state machine (awaiting) ──
    if (ctx.awaiting) {
      return handleStateMachine(db, session, ctx, message, lang, userId);
    }

    // ── Step 4: Classify intent ──
    const intent = classifyIntent(message);

    // ── Step 5: Route by intent with scoped loading ──
    switch (intent) {
      case "billing":
        return handleBilling(db, session, ctx, message, lang);
      case "savings":
        return handleSavings(db, session, ctx, message, lang);
      case "complaint":
        return handleComplaintStart(db, session, ctx, lang);
      case "tariff":
      case "general":
        return handleRAG(db, session, message, lang);
      case "outage":
        return handleTemplate(db, session, intent, lang === "AR"
          ? "للإبلاغ عن انقطاع الكهرباء، استخدم صفحة 'الإبلاغ عن انقطاع' من قائمة الخدمات. هناك بتقدر تحدد موقعك بالضبط."
          : "To report an outage, use the 'Report Outage' page from the Services menu. You can pin your exact location there.",
          intent);
      case "contact":
        return handleTemplate(db, session, intent, lang === "AR"
          ? "جيبكو: 1220\nالتوزيع الكهربائي: 1222\nخدمة العملاء: +962-6-4600-600\nالموقع: services.jepco.com.jo"
          : "JEPCO: 1220\nDistribution: 1222\nCustomer Service: +962-6-4600-600\nWebsite: services.jepco.com.jo",
          intent);
      default:
        return handleRAG(db, session, message, lang);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    const status = msg === "Unauthorized" ? 401 : 500;
    return jsonRes({ error: msg }, status);
  }
});

// ─── Types ─────────────────────────────────────────────────

interface SessionContext {
  file_number?: string;
  company?: string;
  household_size?: number;
  current_kwh?: number;
  current_tier?: number;
  last_bill_jd?: number;
  awaiting?: string;
  complaint_draft?: { type?: string; description?: string };
}

interface Session {
  id: string;
  user_id: string;
  language: string;
  context: SessionContext;
}

// ─── Session helpers ───────────────────────────────────────

type DB = ReturnType<typeof createServiceClient>;

async function getUserLang(db: DB, userId: string): Promise<"AR" | "EN"> {
  const { data } = await db.from("profiles").select("language").eq("id", userId).single();
  return (data?.language === "EN" ? "EN" : "AR");
}

async function getSession(db: DB, id: string, userId: string): Promise<Session | null> {
  const { data } = await db.from("chat_sessions")
    .select("id, user_id, language, context")
    .eq("id", id).eq("user_id", userId).single();
  return data as Session | null;
}

async function getActiveSession(db: DB, userId: string): Promise<Session | null> {
  const { data } = await db.from("chat_sessions")
    .select("id, user_id, language, context")
    .eq("user_id", userId).eq("is_active", true)
    .order("created_at", { ascending: false }).limit(1).single();
  return data as Session | null;
}

async function createSession(db: DB, userId: string, lang: string): Promise<Session> {
  // Hydrate context with lightweight scalars
  let sub: any = null;
  try {
    const { data, error } = await db.from("subscriptions")
      .select("id, file_number, distribution_company, household_size")
      .eq("user_id", userId).single();
    if (!error) sub = data;
  } catch {
    // No subscription — continue with empty context
  }

  const ctx: SessionContext = {};
  if (sub) {
    ctx.file_number = sub.file_number;
    ctx.company = sub.distribution_company;
    ctx.household_size = sub.household_size;

    // Get latest cached data for scalars
    try {
      const { data: cache } = await db.from("jepco_cache")
        .select("data").eq("subscription_id", sub.id).eq("endpoint", "smart_meter").single();
      if (cache?.data) {
        const sm = cache.data as Record<string, string>;
        ctx.current_kwh = parseFloat(sm.expectedElectricityConsumptionQuntity || "0");
        ctx.current_tier = ctx.current_kwh > 600 ? 3 : ctx.current_kwh > 300 ? 2 : 1;
      }
    } catch {
      // Cache miss — not critical
    }

    try {
      const { data: bills } = await db.from("bills_cache")
        .select("total_amount_fils").eq("subscription_id", sub.id)
        .order("billing_period_end", { ascending: false }).limit(1).single();
      if (bills) {
        ctx.last_bill_jd = Number(bills.total_amount_fils) / 1000;
      }
    } catch {
      // No bills — not critical
    }
  }

  const { data } = await db.from("chat_sessions")
    .insert({ user_id: userId, language: lang, context: ctx, subscription_id: sub?.id || null })
    .select("id, user_id, language, context").single();

  return data as Session;
}

async function updateContext(db: DB, sessionId: string, updates: Partial<SessionContext>) {
  const { data: session } = await db.from("chat_sessions")
    .select("context").eq("id", sessionId).single();
  const ctx = { ...(session?.context || {}), ...updates };
  await db.from("chat_sessions").update({ context: ctx }).eq("id", sessionId);
}

async function saveAssistantMessage(
  db: DB, sessionId: string, content: string, intent: string,
  actionType?: string, actionRefId?: string
) {
  await db.from("chat_messages").insert({
    session_id: sessionId,
    role: "assistant",
    content,
    intent,
    action_type: actionType,
    action_ref_id: actionRefId,
  });
}

// ─── Handlers ──────────────────────────────────────────────

async function handleBilling(
  db: DB, session: Session, ctx: SessionContext, message: string, lang: string
): Promise<Response> {
  // Intent-scoped: only needs context scalars (already in session)
  const prompt = BILLING_PROMPT_AR
    .replace("{file_number}", ctx.file_number || "غير متوفر")
    .replace("{current_kwh}", String(ctx.current_kwh || 0))
    .replace("{current_tier}", String(ctx.current_tier || 1))
    .replace("{last_bill_jd}", String(ctx.last_bill_jd || 0))
    .replace("{query}", message);

  const systemPrompt = lang === "AR" ? SYSTEM_PROMPT_AR : SYSTEM_PROMPT_EN;
  return streamAIResponse(db, session.id, systemPrompt, prompt, "billing", lang as "AR" | "EN");
}

async function handleSavings(
  db: DB, session: Session, ctx: SessionContext, message: string, lang: string
): Promise<Response> {
  // Intent-scoped: context scalars + RAG for tips
  const ragContext = await fetchRAGContext(db, "نصائح توفير الطاقة الكهرباء savings tips");

  const bill = ctx.current_kwh ? calcBillBreakdown(ctx.current_kwh) : null;
  const prompt = SAVINGS_PROMPT_AR
    .replace("{consumption_kwh}", String(ctx.current_kwh || 0))
    .replace("{current_tier}", String(ctx.current_tier || 1))
    .replace("{total_amount_jod}", String(bill?.total.toFixed(3) || "0"))
    .replace("{context}", ragContext);

  const systemPrompt = lang === "AR" ? SYSTEM_PROMPT_AR : SYSTEM_PROMPT_EN;
  return streamAIResponse(db, session.id, systemPrompt, prompt, "savings", lang as "AR" | "EN");
}

async function handleRAG(
  db: DB, session: Session, message: string, lang: string
): Promise<Response> {
  // Intent-scoped: only knowledge_docs via pgvector
  const ragContext = await fetchRAGContext(db, message);

  const prompt = CONSUMER_QA_PROMPT_AR
    .replace("{context}", ragContext || "(لا تتوفر مستندات مرجعية)")
    .replace("{query}", message);

  const systemPrompt = lang === "AR" ? SYSTEM_PROMPT_AR : SYSTEM_PROMPT_EN;
  return streamAIResponse(db, session.id, systemPrompt, prompt, "general", lang as "AR" | "EN");
}

async function handleComplaintStart(
  db: DB, session: Session, ctx: SessionContext, lang: string
): Promise<Response> {
  // No DB reads needed — just update state machine
  await updateContext(db, session.id, { awaiting: "complaint_type", complaint_draft: {} });

  const text = lang === "AR" ? COMPLAINT_PROMPTS.ask_type_ar : COMPLAINT_PROMPTS.ask_type_en;
  await saveAssistantMessage(db, session.id, text, "complaint");
  return jsonRes({ reply: text, session_id: session.id, intent: "complaint" });
}

async function handleStateMachine(
  db: DB, session: Session, ctx: SessionContext, message: string, lang: string, userId: string
): Promise<Response> {
  const draft = ctx.complaint_draft || {};

  if (ctx.awaiting === "complaint_type") {
    const cType = parseComplaintType(message);
    if (!cType) {
      const text = lang === "AR"
        ? "ما فهمت النوع. اختر: انقطاع، فاتورة، عداد، جهد، أخرى"
        : "I didn't catch that. Choose: outage, billing, meter, voltage, other";
      await saveAssistantMessage(db, session.id, text, "complaint");
      return jsonRes({ reply: text, session_id: session.id });
    }

    draft.type = cType;
    await updateContext(db, session.id, { awaiting: "complaint_description", complaint_draft: draft });
    const text = lang === "AR" ? COMPLAINT_PROMPTS.ask_description_ar : COMPLAINT_PROMPTS.ask_description_en;
    await saveAssistantMessage(db, session.id, text, "complaint");
    return jsonRes({ reply: text, session_id: session.id });
  }

  if (ctx.awaiting === "complaint_description") {
    draft.description = message;
    await updateContext(db, session.id, { awaiting: "complaint_confirm", complaint_draft: draft });

    const template = lang === "AR" ? COMPLAINT_PROMPTS.confirm_ar : COMPLAINT_PROMPTS.confirm_en;
    const text = template.replace("{type}", draft.type || "").replace("{description}", draft.description || "");
    await saveAssistantMessage(db, session.id, text, "complaint");
    return jsonRes({ reply: text, session_id: session.id });
  }

  if (ctx.awaiting === "complaint_confirm") {
    const confirmed = isConfirmation(message);

    if (confirmed === true) {
      // Create complaint
      const { data: complaint } = await db.from("complaints").insert({
        user_id: userId,
        complaint_type: draft.type || "OTHER",
        description: draft.description || message,
        source: "chatbot",
      }).select("id, reference_number").single();

      await updateContext(db, session.id, { awaiting: undefined, complaint_draft: undefined });

      const ref = complaint?.reference_number || "CMP-000000";
      const template = lang === "AR" ? COMPLAINT_PROMPTS.success_ar : COMPLAINT_PROMPTS.success_en;
      const text = template.replace("{ref}", ref);

      await saveAssistantMessage(db, session.id, text, "complaint", "created_complaint", complaint?.id);
      return jsonRes({ reply: text, session_id: session.id, action: "created_complaint", ref });
    }

    if (confirmed === false) {
      await updateContext(db, session.id, { awaiting: undefined, complaint_draft: undefined });
      const text = lang === "AR" ? COMPLAINT_PROMPTS.cancelled_ar : COMPLAINT_PROMPTS.cancelled_en;
      await saveAssistantMessage(db, session.id, text, "complaint");
      return jsonRes({ reply: text, session_id: session.id });
    }

    // Unclear response
    const text = lang === "AR" ? "أيوا ولا لا؟" : "Yes or no?";
    await saveAssistantMessage(db, session.id, text, "complaint");
    return jsonRes({ reply: text, session_id: session.id });
  }

  // Unknown awaiting state — clear it
  await updateContext(db, session.id, { awaiting: undefined });
  return handleRAG(db, session, message, lang);
}

async function handleTemplate(
  db: DB, session: Session, intent: string, text: string
): Promise<Response> {
  await saveAssistantMessage(db, session.id, text, intent);
  return jsonRes({ reply: text, session_id: session.id, intent });
}

// ─── AI Streaming ──────────────────────────────────────────

async function streamAIResponse(
  db: DB, sessionId: string, systemPrompt: string, userPrompt: string,
  intent: string, lang: "AR" | "EN"
): Promise<Response> {
  let stream: ReadableStream<Uint8Array>;
  try {
    stream = await claudeStream(systemPrompt, userPrompt);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "AI service unavailable";
    return jsonRes({ error: errorMsg, session_id: sessionId }, 502);
  }

  let fullText = "";

  // Create a TransformStream that collects text while streaming to client
  const encoder = new TextEncoder();
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  // Process in background
  (async () => {
    try {
      for await (const chunk of parseClaudeStream(stream)) {
        fullText += chunk;
        await writer.write(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`));
      }

      // Validate the full response
      const validated = validateResponse(fullText, lang);

      // Send done event
      await writer.write(encoder.encode(`data: ${JSON.stringify({ done: true, session_id: sessionId })}\n\n`));

      // Save assistant message (validated version)
      await saveAssistantMessage(db, sessionId, validated, intent);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Stream error";
      await writer.write(encoder.encode(`data: ${JSON.stringify({ error: errorMsg })}\n\n`));
    } finally {
      await writer.close();
    }
  })();

  return new Response(readable, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

// ─── RAG helper ────────────────────────────────────────────

async function fetchRAGContext(db: DB, query: string): Promise<string> {
  try {
    const embedding = await getEmbedding(query);
    const { data: docs } = await db.rpc("match_knowledge_docs", {
      query_embedding: embedding,
      match_count: 3,
    });

    if (!docs?.length) return "(لا تتوفر مستندات مرجعية)";

    return docs
      .map((d: any, i: number) => `[${i + 1}] (${d.source_file} — ${d.section_title})\n${d.content}`)
      .join("\n\n");
  } catch {
    return "(لا تتوفر مستندات مرجعية)";
  }
}

// ─── Utilities ─────────────────────────────────────────────

function jsonRes(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
