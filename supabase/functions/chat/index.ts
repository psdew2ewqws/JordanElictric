/**
 * Diaa Chat Edge Function — tool-using AI electricity expert.
 *
 * Architecture: No intent routing. Claude decides what tools to call
 * based on the conversation. The handler is a simple pipeline:
 *   auth → save message → load history → call Claude with tools → stream → save response
 */

import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { createServiceClient, getUserId } from "../_shared/supabase.ts";
import { claudeToolStream, type ClaudeMessage } from "../_shared/ai-clients.ts";
import { validateResponse } from "../_shared/validators.ts";
import { buildSystemPrompt, type UserProfile } from "../_shared/prompts.ts";
import { TOOL_DEFINITIONS, executeTool, type ToolContext } from "../_shared/chat-tools.ts";

type DB = ReturnType<typeof createServiceClient>;

Deno.serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  try {
    const userId = await getUserId(req);
    const body = await req.json();
    const { message, session_id } = body;
    if (!message) return jsonRes({ error: "message is required" }, 400);
    const wantsStream = body.stream !== false &&
      new URL(req.url).searchParams.get("stream") !== "false";

    const db = createServiceClient();

    // ── 1. Get or create session ──
    const session = await getOrCreateSession(db, userId, session_id);

    // ── 2. Save user message ──
    await db.from("chat_messages").insert({
      session_id: session.id,
      role: "user",
      content: message,
      message_type: "text",
    });

    // ── 3. Load conversation history (last 10 messages) ──
    const history = await loadHistory(db, session.id);

    // ── 4. Build system prompt with user profile ──
    const systemPrompt = buildSystemPrompt(session.lang, session.profile);

    // ── 5. Build messages array ──
    const messages: ClaudeMessage[] = [
      ...history,
      { role: "user", content: message },
    ];

    // ── 6. Build tool context ──
    const toolCtx: ToolContext = {
      db,
      userId,
      subscriptionId: session.subscriptionId,
      fileNumber: session.profile.file_number || null,
    };

    // ── 7. Call Claude with tools → stream response ──
    const { stream, getFullText } = await claudeToolStream(
      systemPrompt,
      messages,
      TOOL_DEFINITIONS,
      (name, input) => executeTool(name, input, toolCtx),
      { maxTokens: 1500, temperature: 0.6 },
    );

    // ── 8. Non-streaming fallback (?stream=false) ──
    if (!wantsStream) {
      const reader = stream.getReader();
      while (true) {
        const { done } = await reader.read();
        if (done) break;
      }
      const fullText = getFullText();
      const validated = validateResponse(fullText, session.lang);
      if (validated) {
        await db.from("chat_messages").insert({
          session_id: session.id,
          role: "assistant",
          content: validated,
          message_type: "text",
        });
      }
      return jsonRes({
        reply: validated || (session.lang === "AR" ? "عذراً، حدث خطأ." : "Sorry, an error occurred."),
        session_id: session.id,
      });
    }

    // ── 9. Wrap stream to save assistant message on completion ──
    const encoder = new TextEncoder();
    const { readable, writable } = new TransformStream<Uint8Array>();
    const writer = writable.getWriter();

    // Pipe Claude's stream through, then save on completion
    (async () => {
      try {
        const reader = stream.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          await writer.write(value);
        }

        // Save the full response
        const fullText = getFullText();
        const validated = validateResponse(fullText, session.lang);
        if (validated) {
          await db.from("chat_messages").insert({
            session_id: session.id,
            role: "assistant",
            content: validated,
            message_type: "text",
          });
        }

        // Send session_id in final event
        await writer.write(
          encoder.encode(`data: ${JSON.stringify({ session_id: session.id })}\n\n`)
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Stream error";
        await writer.write(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
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
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return jsonRes({ error: msg }, msg === "Unauthorized" ? 401 : 500);
  }
});

// ─── Session Management ───────────────────────────────────

interface SessionData {
  id: string;
  lang: "AR" | "EN";
  subscriptionId: string | null;
  profile: UserProfile;
}

async function getOrCreateSession(db: DB, userId: string, sessionId?: string): Promise<SessionData> {
  // Try existing session
  if (sessionId) {
    const { data } = await db.from("chat_sessions")
      .select("id, language, subscription_id, context")
      .eq("id", sessionId).eq("user_id", userId).single();
    if (data) return mapSession(data);
  }

  // Try active session
  const { data: active } = await db.from("chat_sessions")
    .select("id, language, subscription_id, context")
    .eq("user_id", userId).eq("is_active", true)
    .order("created_at", { ascending: false }).limit(1).single();
  if (active) return mapSession(active);

  // Create new session
  const lang = await getUserLang(db, userId);
  const sub = await getSubscription(db, userId);
  const profile = await buildProfile(db, sub);

  const { data } = await db.from("chat_sessions")
    .insert({
      user_id: userId,
      language: lang,
      subscription_id: sub?.id || null,
      context: profile,
    })
    .select("id, language, subscription_id, context").single();

  return mapSession(data!);
}

function mapSession(row: any): SessionData {
  const ctx = (row.context || {}) as Record<string, unknown>;
  return {
    id: row.id,
    lang: row.language === "EN" ? "EN" : "AR",
    subscriptionId: row.subscription_id,
    profile: {
      name: ctx.name as string || null,
      file_number: ctx.file_number as string || null,
      household_size: ctx.household_size as number || null,
      company: ctx.company as string || null,
    },
  };
}

async function getUserLang(db: DB, userId: string): Promise<"AR" | "EN"> {
  const { data } = await db.from("profiles").select("language").eq("id", userId).single();
  return data?.language === "EN" ? "EN" : "AR";
}

async function getSubscription(db: DB, userId: string) {
  const { data } = await db.from("subscriptions")
    .select("id, file_number, distribution_company, household_size")
    .eq("user_id", userId).single();
  return data;
}

async function buildProfile(db: DB, sub: any): Promise<UserProfile> {
  if (!sub) return {};

  const profile: UserProfile = {
    file_number: sub.file_number,
    company: sub.distribution_company,
    household_size: sub.household_size,
  };

  // Try to get subscriber name from SAP cache
  try {
    const { data } = await db.from("jepco_cache")
      .select("data").eq("subscription_id", sub.id).eq("endpoint", "sap_info").single();
    if (data?.data) {
      const sap = data.data as Record<string, string>;
      if (sap.firstName) profile.name = `${sap.firstName} ${sap.familyName || ""}`.trim();
    }
  } catch { /* not critical */ }

  return profile;
}

// ─── Conversation History ─────────────────────────────────

async function loadHistory(db: DB, sessionId: string): Promise<ClaudeMessage[]> {
  const { data: rows } = await db.from("chat_messages")
    .select("role, content")
    .eq("session_id", sessionId)
    .in("role", ["user", "assistant"])
    .order("created_at", { ascending: true })
    .limit(10);

  if (!rows?.length) return [];

  // Claude requires alternating user/assistant — dedupe consecutive same-role
  const messages: ClaudeMessage[] = [];
  for (const row of rows) {
    const role = row.role as "user" | "assistant";
    const last = messages[messages.length - 1];
    if (last && last.role === role) {
      // Merge consecutive same-role messages
      last.content = `${last.content}\n${row.content}`;
    } else {
      messages.push({ role, content: row.content });
    }
  }

  // Claude requires first message to be user role
  if (messages.length > 0 && messages[0].role === "assistant") {
    messages.shift();
  }

  return messages;
}

// ─── Utility ──────────────────────────────────────────────

function jsonRes(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
