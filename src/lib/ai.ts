import type { AiSettings } from "./settings";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export async function streamAiChat(
  settings: AiSettings,
  messages: ChatMessage[],
  onDelta: (text: string) => void,
  signal?: AbortSignal
): Promise<void> {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      messages,
      model: settings.model,
      apiKey: settings.apiKey,
      provider: settings.provider,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    let message = `Request failed (${res.status})`;
    try {
      const parsed = JSON.parse(errText) as { error?: unknown };
      if (typeof parsed.error === "string" && parsed.error) {
        message = parsed.error;
      }
    } catch {
      /* use generic message */
    }
    throw new Error(message);
  }

  const reader = res.body?.getReader();
  if (!reader) {
    const text = await res.text();
    onDelta(text);
    return;
  }

  const dec = new TextDecoder();
  let buffer = "";
  const processLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed === "data: [DONE]") return;
    if (!trimmed.startsWith("data: ")) return;
    const jsonStr = trimmed.slice(6);
    try {
      const parsed = JSON.parse(jsonStr) as {
        choices?: Array<{ delta?: { content?: string } }>;
      };
      const piece = parsed.choices?.[0]?.delta?.content;
      if (piece) onDelta(piece);
    } catch {
      /* ignore partial JSON */
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += dec.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) processLine(line);
  }

  buffer += dec.decode();
  if (buffer.trim()) {
    processLine(buffer);
  }
}

export async function completeAiChat(
  settings: AiSettings,
  messages: ChatMessage[],
  signal?: AbortSignal
): Promise<string> {
  let out = "";
  await streamAiChat(settings, messages, (delta) => {
    out += delta;
  }, signal);
  return out;
}
