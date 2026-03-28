import { NextRequest } from "next/server";
import { isAllowedModel, type ModelProvider } from "@/lib/modelCatalog";
import {
  AI_PROXY_MAX_BODY_BYTES,
  jsonError,
} from "@/lib/aiProxySecurity";

const OPENAI_BASE = "https://api.openai.com/v1";

type ChatMessage = { role: string; content: string };

type Body = {
  messages: ChatMessage[];
  model: string;
  apiKey: string;
  provider?: ModelProvider;
};

const MAX_MESSAGES = 200;

function drainResponse(res: Response): void {
  void res.text().catch(() => {});
}

/** Never log or return provider bodies — may echo key-related hints. */
function providerErrorResponse(status: number): Response {
  if (status === 401 || status === 403) {
    return jsonError("API key was rejected by the provider.", 401);
  }
  if (status === 429) {
    return jsonError("Provider rate limit reached. Try again shortly.", 429);
  }
  if (status >= 400 && status < 500) {
    return jsonError("AI request was not accepted. Check your key and model.", 400);
  }
  return jsonError("AI service temporarily unavailable. Try again later.", 502);
}

function toGeminiPayload(messages: ChatMessage[]) {
  const systemChunks: string[] = [];
  const contents: { role: string; parts: { text: string }[] }[] = [];
  for (const m of messages) {
    if (m.role === "system") {
      systemChunks.push(m.content);
    } else if (m.role === "user") {
      contents.push({ role: "user", parts: [{ text: m.content }] });
    } else if (m.role === "assistant") {
      contents.push({ role: "model", parts: [{ text: m.content }] });
    }
  }
  const systemInstruction =
    systemChunks.length > 0 ? { parts: [{ text: systemChunks.join("\n\n") }] } : undefined;
  return { systemInstruction, contents };
}

function extractGeminiText(chunk: unknown): string {
  if (!chunk || typeof chunk !== "object") return "";
  const c = chunk as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };
  const parts = c.candidates?.[0]?.content?.parts;
  if (!parts?.length) return "";
  return parts.map((p) => p.text ?? "").join("");
}

function openAiSseChunk(content: string): string {
  const payload = JSON.stringify({
    choices: [{ delta: { content } }],
  });
  return `data: ${payload}\n\n`;
}

function parseBody(raw: string): Body | null {
  let body: Body;
  try {
    body = JSON.parse(raw) as Body;
  } catch {
    return null;
  }
  if (!body || typeof body !== "object") return null;
  if (!Array.isArray(body.messages)) return null;
  if (body.messages.length > MAX_MESSAGES) return null;
  for (const m of body.messages) {
    if (!m || typeof m !== "object") return null;
    if (typeof m.role !== "string" || typeof m.content !== "string") return null;
  }
  if (typeof body.model !== "string" || typeof body.apiKey !== "string") return null;
  return body;
}

export async function POST(req: NextRequest) {
  const maxBytes = AI_PROXY_MAX_BODY_BYTES;
  const cl = req.headers.get("content-length");
  if (cl) {
    const n = Number.parseInt(cl, 10);
    if (!Number.isNaN(n) && n > maxBytes) {
      return jsonError("Request body too large.", 413);
    }
  }

  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  if (raw.length > maxBytes) {
    return jsonError("Request body too large.", 413);
  }

  const body = parseBody(raw);
  if (!body) {
    return jsonError("Invalid JSON or message payload.", 400);
  }

  const { messages, model, apiKey } = body;
  const provider: ModelProvider =
    body.provider === "gemini" || body.provider === "openai" ? body.provider : "openai";

  if (!apiKey?.trim()) {
    return jsonError("Add your API key in Settings.", 400);
  }

  if (!model?.trim()) {
    return jsonError("Choose a model in Settings.", 400);
  }

  if (!isAllowedModel(provider, model.trim())) {
    return jsonError("Unknown or unsupported model for this provider.", 400);
  }

  if (provider === "openai") {
    const upstream = await fetch(`${OPENAI_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
      }),
    });

    if (!upstream.ok) {
      const st = upstream.status;
      drainResponse(upstream);
      if (process.env.NODE_ENV === "development") {
        console.error("[api/ai] OpenAI error status:", st);
      }
      return providerErrorResponse(st);
    }

    return new Response(upstream.body, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  const { systemInstruction, contents } = toGeminiPayload(messages);
  if (contents.length === 0) {
    return jsonError("No messages to send to Gemini.", 400);
  }

  const geminiBody: Record<string, unknown> = { contents };
  if (systemInstruction) {
    geminiBody.systemInstruction = systemInstruction;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`;

  const upstream = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey.trim(),
    },
    body: JSON.stringify(geminiBody),
  });

  if (!upstream.ok) {
    const st = upstream.status;
    drainResponse(upstream);
    if (process.env.NODE_ENV === "development") {
      console.error("[api/ai] Gemini error status:", st);
    }
    return providerErrorResponse(st);
  }

  if (!upstream.body) {
    return jsonError("Empty response from provider.", 502);
  }

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const reader = upstream.body!.getReader();
      const dec = new TextDecoder();
      let lineBuffer = "";
      let textAccumulated = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          lineBuffer += dec.decode(value, { stream: true });
          const lines = lineBuffer.split("\n");
          lineBuffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === "data: [DONE]") continue;
            if (!trimmed.startsWith("data: ")) continue;
            const jsonStr = trimmed.slice(6).trim();
            if (!jsonStr || jsonStr === "[DONE]") continue;
            let parsed: unknown;
            try {
              parsed = JSON.parse(jsonStr);
            } catch {
              continue;
            }
            const text = extractGeminiText(parsed);
            if (!text) continue;

            let delta = "";
            if (textAccumulated && text.startsWith(textAccumulated)) {
              delta = text.slice(textAccumulated.length);
              textAccumulated = text;
            } else {
              delta = text;
              textAccumulated += text;
            }
            if (delta) {
              controller.enqueue(enc.encode(openAiSseChunk(delta)));
            }
          }
        }
        controller.enqueue(enc.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (e) {
        controller.error(e);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
