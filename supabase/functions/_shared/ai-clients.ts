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

// ─── Claude with Tool Use (multi-turn loop + streaming) ───

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface ClaudeMessage {
  role: "user" | "assistant";
  content: string | Array<{ type: string; [key: string]: unknown }>;
}

/**
 * Sends a conversation to Claude with tools enabled.
 * Handles the tool-use loop: if Claude calls a tool, executes it,
 * appends the result, and re-calls Claude (max 3 iterations).
 *
 * Returns a ReadableStream of SSE events:
 *   data: {"text": "chunk"}          — streamed text
 *   data: {"thinking": true}         — tool is being executed
 *   data: {"done": true}             — response complete
 *
 * @param toolExecutor - async function that runs a tool and returns string result
 */
export async function claudeToolStream(
  systemPrompt: string,
  messages: ClaudeMessage[],
  tools: ToolDefinition[],
  toolExecutor: (name: string, input: Record<string, unknown>) => Promise<string>,
  opts: { model?: string; maxTokens?: number; temperature?: number } = {},
): Promise<{ stream: ReadableStream<Uint8Array>; getFullText: () => string }> {
  const model = opts.model || "claude-sonnet-4-20250514";
  const maxTokens = opts.maxTokens || 1500;
  const temperature = opts.temperature ?? 0.6;
  const MAX_TOOL_ROUNDS = 3;

  let fullText = "";
  const encoder = new TextEncoder();
  const { readable, writable } = new TransformStream<Uint8Array>();
  const writer = writable.getWriter();

  const send = (data: Record<string, unknown>) =>
    writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

  // Run the loop in background so we can return the stream immediately
  (async () => {
    try {
      let currentMessages = [...messages];
      let rounds = 0;

      while (rounds < MAX_TOOL_ROUNDS) {
        // Call Claude
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
            messages: currentMessages,
            tools,
            tool_choice: { type: "auto" },
            stream: true,
          }),
        });

        if (!res.ok) {
          const err = await res.text();
          throw new Error(`Claude API error ${res.status}: ${err}`);
        }

        // Parse the streaming response, collecting content blocks
        const contentBlocks: Array<{ type: string; id?: string; name?: string; text?: string; input?: string }> = [];
        let currentBlockIndex = -1;
        let stopReason = "";

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const raw = line.slice(6).trim();
            if (raw === "[DONE]") continue;

            let event: any;
            try { event = JSON.parse(raw); } catch { continue; }

            switch (event.type) {
              case "content_block_start":
                currentBlockIndex = event.index;
                if (event.content_block?.type === "tool_use") {
                  contentBlocks[currentBlockIndex] = {
                    type: "tool_use",
                    id: event.content_block.id,
                    name: event.content_block.name,
                    input: "",
                  };
                } else if (event.content_block?.type === "text") {
                  contentBlocks[currentBlockIndex] = { type: "text", text: "" };
                }
                break;

              case "content_block_delta":
                if (event.delta?.type === "text_delta" && contentBlocks[event.index]?.type === "text") {
                  const chunk = event.delta.text;
                  contentBlocks[event.index].text += chunk;
                  fullText += chunk;
                  await send({ text: chunk });
                } else if (event.delta?.type === "input_json_delta" && contentBlocks[event.index]?.type === "tool_use") {
                  contentBlocks[event.index].input += event.delta.partial_json || "";
                }
                break;

              case "message_delta":
                stopReason = event.delta?.stop_reason || "";
                break;
            }
          }
        }

        // If Claude stopped with end_turn (no tool calls), we're done
        if (stopReason === "end_turn" || stopReason !== "tool_use") {
          break;
        }

        // Claude wants to use tools — execute them
        const toolBlocks = contentBlocks.filter(b => b.type === "tool_use");
        if (toolBlocks.length === 0) break;

        // Signal thinking state to UI
        await send({ thinking: true });

        // Build the assistant message content (text + tool_use blocks)
        const assistantContent: any[] = [];
        for (const block of contentBlocks) {
          if (block.type === "text" && block.text) {
            assistantContent.push({ type: "text", text: block.text });
          } else if (block.type === "tool_use") {
            let parsedInput = {};
            try { parsedInput = JSON.parse(block.input || "{}"); } catch { /* empty */ }
            assistantContent.push({
              type: "tool_use",
              id: block.id,
              name: block.name,
              input: parsedInput,
            });
          }
        }

        // Add assistant message with tool calls
        currentMessages.push({ role: "assistant", content: assistantContent });

        // Execute each tool and build tool_result messages
        const toolResults: any[] = [];
        for (const block of toolBlocks) {
          let parsedInput = {};
          try { parsedInput = JSON.parse(block.input || "{}"); } catch { /* empty */ }

          const result = await toolExecutor(block.name!, parsedInput);
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: result,
          });
        }

        // Add tool results as user message
        currentMessages.push({ role: "user", content: toolResults });
        rounds++;
      }

      await send({ done: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Stream error";
      await send({ error: msg });
    } finally {
      await writer.close();
    }
  })();

  return { stream: readable, getFullText: () => fullText };
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
