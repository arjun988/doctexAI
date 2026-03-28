"use client";

import { useCallback, useRef, useState } from "react";
import type { AiSettings } from "@/lib/settings";
import { streamAiChat, type ChatMessage } from "@/lib/ai";
import { Send, Sparkles } from "lucide-react";

type Props = {
  settings: AiSettings;
  getDocumentHtml: () => string;
  getSelectionText: () => string;
  insertAtCursor: (text: string) => void;
};

const SYSTEM: ChatMessage = {
  role: "system",
  content:
    "You are an expert writing assistant inside a document editor. Help revise, expand, summarize, or rewrite based on the user's instruction. Be concise unless asked for detail. You may return plain text or minimal HTML fragments (<p>, <strong>, etc.) when appropriate.",
};

export function PromptPanel({
  settings,
  getDocumentHtml,
  getSelectionText,
  insertAtCursor,
}: Props) {
  const [input, setInput] = useState("");
  /** User/assistant only — for display and for building API history */
  const [turns, setTurns] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useSelection, setUseSelection] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollDown = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const send = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || streaming) return;

    setError(null);
    const selection = getSelectionText().trim();
    const docSnippet = getDocumentHtml();
    const prior =
      turns.length > 0
        ? turns
            .map((t) => `${t.role === "user" ? "User" : "Assistant"}: ${t.content}`)
            .join("\n\n")
        : "";

    const contextParts: string[] = [];
    if (useSelection && selection) {
      contextParts.push(`### Selected text\n${selection}`);
    }
    contextParts.push(`### Document (HTML)\n${docSnippet.slice(0, 120_000)}`);
    if (prior) {
      contextParts.push(`### Prior conversation\n${prior}`);
    }
    contextParts.push(`### Instruction\n${trimmed}`);

    const userPayload = contextParts.join("\n\n");
    const apiMessages: ChatMessage[] = [SYSTEM, { role: "user", content: userPayload }];

    setTurns((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    setStreaming(true);

    let assistant = "";
    setTurns((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      await streamAiChat(settings, apiMessages, (delta) => {
        assistant += delta;
        setTurns((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last?.role === "assistant") {
            copy[copy.length - 1] = { ...last, content: assistant };
          }
          return copy;
        });
        scrollDown();
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
      setTurns((prev) => prev.slice(0, -2));
    } finally {
      setStreaming(false);
      scrollDown();
    }
  }, [
    input,
    streaming,
    turns,
    settings,
    getDocumentHtml,
    getSelectionText,
    useSelection,
    scrollDown,
  ]);

  const lastAssistant =
    [...turns].reverse().find((m) => m.role === "assistant")?.content ?? "";

  return (
    <div className="flex h-full min-h-0 flex-col border-l border-surface-border bg-surface">
      <div className="flex items-center gap-2 border-b border-surface-border px-3 py-2">
        <Sparkles className="h-4 w-4 text-accent" />
        <span className="text-xs font-medium text-zinc-300">AI</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        {turns.length === 0 && (
          <p className="text-xs leading-relaxed text-zinc-500">
            Describe edits or ask questions. Document content is sent with each message
            (and selection when enabled). Configure your API key in Settings.
          </p>
        )}
        <ul className="space-y-3">
          {turns.map((m, i) => (
            <li key={i} className="text-xs">
              <span
                className={
                  m.role === "user"
                    ? "font-medium text-emerald-400/90"
                    : "font-medium text-blue-400/90"
                }
              >
                {m.role === "user" ? "You" : "Assistant"}
              </span>
              <pre className="mt-1 whitespace-pre-wrap font-sans text-zinc-300">{m.content}</pre>
            </li>
          ))}
        </ul>
        <div ref={bottomRef} />
      </div>
      {error && (
        <div className="border-t border-red-900/50 bg-red-950/40 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}
      <div className="border-t border-surface-border p-2 space-y-2">
        <label className="flex items-center gap-2 text-[11px] text-zinc-500">
          <input
            type="checkbox"
            checked={useSelection}
            onChange={(e) => setUseSelection(e.target.checked)}
            className="rounded border-surface-border"
          />
          Include selection when non-empty
        </label>
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            placeholder="Ask AI to edit or explain…"
            rows={3}
            disabled={streaming}
            className="min-h-[72px] flex-1 resize-none rounded-lg border border-surface-border bg-surface-overlay px-2 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <button
            type="button"
            onClick={() => void send()}
            disabled={streaming || !input.trim()}
            className="self-end rounded-lg bg-accent p-2 text-white hover:bg-accent-muted disabled:opacity-40"
            title="Send"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <button
          type="button"
          disabled={!lastAssistant}
          onClick={() => insertAtCursor(lastAssistant)}
          className="w-full rounded-lg border border-surface-border py-1.5 text-[11px] text-zinc-400 hover:bg-surface-overlay hover:text-zinc-200 disabled:opacity-40"
        >
          Insert last reply at cursor
        </button>
      </div>
    </div>
  );
}
