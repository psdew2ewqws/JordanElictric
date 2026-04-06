/**
 * AI provider clients for Edge Functions.
 * OpenAI: embeddings, vision. Claude: conversational.
 */

const OPENAI_KEY = () => Deno.env.get("OPENAI_API_KEY") || "";
const ANTHROPIC_KEY = () => Deno.env.get("ANTHROPIC_API_KEY") || "";

// ─── Claude (streaming) ────────────────────────────────────

export async function claudeStream(
  systemPrompt: string,
  userPrompt: string,
  opts: { model?: string; maxTokens?: number; temperature?: number } = {}
): Promise<ReadableStream<Uint8Array>> {
  const model = opts.model || "claude-sonnet-4-20250514";
  const maxTokens = opts.maxTokens || 500;
  const temperature = opts.temperature ?? 0.7;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_KEY(),
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      stream: true,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API error ${res.status}: ${err}`);
  }

  return res.body!;
}

// Parse SSE stream from Claude into text chunks
export async function* parseClaudeStream(
  stream: ReadableStream<Uint8Array>
): AsyncGenerator<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") return;

        try {
          const parsed = JSON.parse(data);
          if (parsed.type === "content_block_delta" && parsed.delta?.text) {
            yield parsed.delta.text;
          }
        } catch {
          // skip unparseable lines
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// Non-streaming Claude call (for short responses like complaint templates)
export async function claudeChat(
  systemPrompt: string,
  userPrompt: string,
  opts: { model?: string; maxTokens?: number } = {}
): Promise<string> {
  const model = opts.model || "claude-sonnet-4-20250514";
  const maxTokens = opts.maxTokens || 500;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_KEY(),
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature: 0.7,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text || "";
}

// ─── OpenAI Embeddings ─────────────────────────────────────

export async function getEmbedding(text: string): Promise<number[]> {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_KEY()}`,
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI embeddings error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.data[0].embedding;
}
