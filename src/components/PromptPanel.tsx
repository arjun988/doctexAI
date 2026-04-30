"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type { AiSettings } from "@/lib/settings";
import { AI_TOOLS, parseSlashCommand, primarySlash, type AiToolId } from "@/lib/aiTools";
import { streamAiChat, type ChatMessage } from "@/lib/ai";
import {
  Check,
  BookOpen,
  Copy,
  LibraryBig,
  GripVertical,
  ListTree,
  Loader2,
  Send,
  Sigma,
  Sparkles,
  SpellCheck,
  TextSelect,
  X,
} from "lucide-react";

type ContextBlock = {
  id: string;
  text: string;
  source: "paste" | "selection";
};

type ApplyTarget = { type: "document" } | { type: "range"; from: number; to: number };

type Props = {
  settings: AiSettings;
  getDocumentHtml: () => string;
  getSelectionText: () => string;
  getSelectionRange: () => { from: number; to: number } | null;
  applyAiHtml: (html: string, target: ApplyTarget) => void;
  stageAiSuggestion: (html: string, target: ApplyTarget) => boolean;
  acceptStagedSuggestion: () => boolean;
  rejectStagedSuggestion: () => boolean;
  hasStagedSuggestion: () => boolean;
  subscribeStagedSuggestion: (listener: (active: boolean) => void) => () => void;
};

export type PromptPanelHandle = {
  runTool: (tool: AiToolId) => void;
};

const NO_APPLY = /^\s*NO_APPLY:\s*([\s\S]*)$/i;

/** Shown in chat while the model streams HTML that we apply to the doc (never show raw tags). */
const MSG_APPLYING_TO_DOC = "Applying changes to your document…";
/** Shown after a successful document edit (the editor holds the real HTML). */
const MSG_APPLIED_TO_DOC =
  "I've applied that change to your document — you should see it in the editor.";
const MSG_PROPOSED_CHANGE =
  "I prepared a tracked rewrite suggestion. Review it and choose Accept or Reject.";
const MSG_INLINE_TRACKED =
  "I inserted a tracked suggestion inline in your document (old vs new). Review it in the editor and click Accept or Reject.";

const SYSTEM: ChatMessage = {
  role: "system",
  content: `You are an expert writing assistant inside a TipTap/HTML document editor.

When the user wants the document changed (rewrite, edit, fix, translate, format, expand, shorten):
- Output ONLY the replacement as HTML (e.g. <p>, <strong>, <ul>, <li>) or plain text lines (they will be wrapped as paragraphs). No markdown code fences unless you need to wrap raw HTML.
- Do not add conversational preambles ("Here is…", "Sure!").
- Respect the apply target provided in the instruction context:
  - If apply target is **selection**, output the fragment that replaces only that selected passage.
  - If apply target is **full document**, output the full document body as HTML.
- Execute every requested edit in the user instruction (including multi-part requests). Do not stop after the first change.
- For multi-part edits, internally process as a checklist and ensure all items are reflected in one final output.
- Do not change unrelated text. Outside the requested edits, preserve wording, order, structure, and citations exactly.

If the user asks a **pure question** that must NOT change the document (definitions, explanations, "what does X mean"), respond with exactly this format on the first line:
NO_APPLY:
Then your answer below. Do not output document HTML in that case.`,
};

const QUICK_PROMPTS = [
  "Summarize the document",
  "Improve clarity and tone",
  "Fix grammar and spelling",
  "Make the selection more concise",
] as const;

function newBlockId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `ctx-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function htmlToPlainText(input: string): string {
  return input
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h1|h2|h3|h4|h5|h6|blockquote|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function buildLineDiffPreview(beforeText: string, afterText: string): string[] {
  const before = beforeText.split(/\r?\n/).map((s) => s.trim());
  const after = afterText.split(/\r?\n/).map((s) => s.trim());
  const total = Math.max(before.length, after.length);
  const out: string[] = [];
  for (let i = 0; i < total; i += 1) {
    const b = before[i] ?? "";
    const a = after[i] ?? "";
    if (!b && !a) continue;
    if (b === a) {
      out.push(`  ${b}`);
      continue;
    }
    if (b) out.push(`- ${b}`);
    if (a) out.push(`+ ${a}`);
  }
  return out.slice(0, 16);
}

export const PromptPanel = forwardRef<PromptPanelHandle, Props>(function PromptPanel(
  {
    settings,
    getDocumentHtml,
    getSelectionText,
    getSelectionRange,
    applyAiHtml,
    stageAiSuggestion,
    acceptStagedSuggestion,
    rejectStagedSuggestion,
    hasStagedSuggestion,
    subscribeStagedSuggestion,
  },
  ref
) {
  const [input, setInput] = useState("");
  const [contextBlocks, setContextBlocks] = useState<ContextBlock[]>([]);
  const [turns, setTurns] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useSelection, setUseSelection] = useState(true);
  const [reviewBeforeApply, setReviewBeforeApply] = useState(true);
  const [pendingSuggestion, setPendingSuggestion] = useState<{
    html: string;
    target: ApplyTarget;
    inline: boolean;
    diffPreview: string[];
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollDown = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const addSelectionAsContext = useCallback(() => {
    const t = getSelectionText().trim();
    if (!t) return;
    setContextBlocks((prev) => [
      ...prev,
      { id: newBlockId(), text: t, source: "selection" },
    ]);
  }, [getSelectionText]);

  const onPasteComposer = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const ne = e.nativeEvent as Event & { shiftKey?: boolean };
    if (ne.shiftKey) return;
    const text = e.clipboardData.getData("text/plain");
    if (!text?.trim()) return;
    e.preventDefault();
    setContextBlocks((prev) => [
      ...prev,
      { id: newBlockId(), text: text.trim(), source: "paste" },
    ]);
  }, []);

  const executeRequest = useCallback(
    async (args: { userDisplay: string; instructionBody: string; forceReview?: boolean }) => {
      const { userDisplay, instructionBody, forceReview = false } = args;
      if (!instructionBody.trim() || streaming) return;
      if (pendingSuggestion) {
        if (pendingSuggestion.inline && !hasStagedSuggestion()) {
          setPendingSuggestion(null);
        } else {
        setError("You have a pending AI suggestion. Accept or reject it before sending a new request.");
        return;
        }
      }

      setError(null);
      const selectionRange = useSelection ? getSelectionRange() : null;
      const selectionText = getSelectionText().trim();
      const docSnippet = getDocumentHtml();
      const prior =
        turns.length > 0
          ? turns
              .map((t) => `${t.role === "user" ? "User" : "Assistant"}: ${t.content}`)
              .join("\n\n")
          : "";

      const contextParts: string[] = [];
      if (contextBlocks.length > 0) {
        contextBlocks.forEach((b, i) => {
          const label = b.source === "paste" ? "Pasted context" : "Context from selection";
          contextParts.push(`### ${label} (${i + 1})\n${b.text}`);
        });
      }
      if (useSelection && selectionText && selectionRange) {
        contextParts.push(`### Active editor selection (plain text)\n${selectionText}`);
      }
      contextParts.push(`### Document (HTML)\n${docSnippet.slice(0, 120_000)}`);
      if (prior) {
        contextParts.push(`### Prior conversation\n${prior}`);
      }
      const applyHint =
        selectionRange && useSelection
          ? "Apply target: **selection** — output only the replacement HTML for the selected range."
          : "Apply target: **full document** — output the full document body as HTML.";
      const completionHint =
        "Important: complete all requested edits step-by-step in one response. Preserve all unrelated text exactly.";
      contextParts.push(`### Instruction\n${instructionBody}\n\n${applyHint}\n${completionHint}`);

      const userPayload = contextParts.join("\n\n");
      const apiMessages: ChatMessage[] = [SYSTEM, { role: "user", content: userPayload }];

      setTurns((prev) => [...prev, { role: "user", content: userDisplay }]);
      setInput("");
      setContextBlocks([]);
      setStreaming(true);

      let assistant = "";
      setTurns((prev) => [...prev, { role: "assistant", content: "" }]);
      queueMicrotask(() => scrollDown());

      const defaultApplyTarget =
        selectionRange && useSelection
          ? ({ type: "range" as const, from: selectionRange.from, to: selectionRange.to } as const)
          : ({ type: "document" as const } as const);

      try {
        await streamAiChat(settings, apiMessages, (delta) => {
          assistant += delta;
          setTurns((prev) => {
            const copy = [...prev];
            const last = copy[copy.length - 1];
            if (last?.role === "assistant") {
              const isNoApply = /^\s*NO_APPLY:/i.test(assistant);
              let display = "";
              if (isNoApply) {
                display = assistant.replace(/^\s*NO_APPLY:\s*/i, "").trimEnd();
              } else if (assistant.trim()) {
                display = MSG_APPLYING_TO_DOC;
              }
              copy[copy.length - 1] = { ...last, content: display };
            }
            return copy;
          });
          requestAnimationFrame(() => scrollDown());
        });

        const noApplyMatch = assistant.match(NO_APPLY);
        if (noApplyMatch) {
          const answer = noApplyMatch[1].trim();
          setTurns((prev) => {
            const copy = [...prev];
            const last = copy[copy.length - 1];
            if (last?.role === "assistant") {
              copy[copy.length - 1] = { ...last, content: answer };
            }
            return copy;
          });
        } else {
          const assistantPayload = assistant;
          const resolvedApplyTarget: ApplyTarget = defaultApplyTarget;

          const shouldReview = forceReview || reviewBeforeApply;
          if (shouldReview) {
            const beforeText =
              resolvedApplyTarget.type === "range" && selectionText
                ? selectionText
                : htmlToPlainText(docSnippet);
            const afterText = htmlToPlainText(assistantPayload);
            const diffPreview = buildLineDiffPreview(beforeText, afterText);
            const stagedInline = stageAiSuggestion(assistantPayload, resolvedApplyTarget);
            setPendingSuggestion({
              html: assistantPayload,
              target: resolvedApplyTarget,
              inline: stagedInline,
              diffPreview,
            });
            setTurns((prev) => {
              const copy = [...prev];
              const last = copy[copy.length - 1];
              if (last?.role === "assistant") {
                copy[copy.length - 1] = {
                  ...last,
                  content: stagedInline ? MSG_INLINE_TRACKED : MSG_PROPOSED_CHANGE,
                };
              }
              return copy;
            });
          } else {
            applyAiHtml(assistantPayload, resolvedApplyTarget);
            setTurns((prev) => {
              const copy = [...prev];
              const last = copy[copy.length - 1];
              if (last?.role === "assistant") {
                copy[copy.length - 1] = { ...last, content: MSG_APPLIED_TO_DOC };
              }
              return copy;
            });
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Request failed");
        setTurns((prev) => prev.slice(0, -2));
      } finally {
        setStreaming(false);
        scrollDown();
      }
    },
    [
      streaming,
      turns,
      settings,
      getDocumentHtml,
      getSelectionText,
      getSelectionRange,
      useSelection,
      reviewBeforeApply,
      pendingSuggestion,
      hasStagedSuggestion,
      contextBlocks,
      scrollDown,
      applyAiHtml,
      stageAiSuggestion,
    ]
  );

  const send = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || streaming) return;

    const parsed = parseSlashCommand(trimmed);
    const instructionBody = parsed
      ? `${AI_TOOLS[parsed.tool].instruction}${parsed.extra ? `\n\nAdditional notes: ${parsed.extra}` : ""}`
      : trimmed;

    await executeRequest({ userDisplay: trimmed, instructionBody });
  }, [input, streaming, executeRequest]);

  const runTool = useCallback(
    (tool: AiToolId) => {
      void executeRequest({
        userDisplay: primarySlash(tool),
        instructionBody: AI_TOOLS[tool].instruction,
        forceReview: true,
      });
    },
    [executeRequest]
  );

  useImperativeHandle(ref, () => ({ runTool }), [runTool]);

  const lastAssistant =
    [...turns].reverse().find((m) => m.role === "assistant")?.content ?? "";

  function clearConversation() {
    if (turns.length === 0) return;
    setTurns([]);
    setError(null);
  }

  async function copyLastReply() {
    if (!lastAssistant.trim()) return;
    try {
      await navigator.clipboard.writeText(lastAssistant);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  function acceptSuggestion() {
    if (!pendingSuggestion) return;
    if (pendingSuggestion.inline) {
      acceptStagedSuggestion();
    } else {
      applyAiHtml(pendingSuggestion.html, pendingSuggestion.target);
    }
    setPendingSuggestion(null);
    setTurns((prev) => {
      if (prev.length === 0) return prev;
      const copy = [...prev];
      const last = copy[copy.length - 1];
      if (last?.role === "assistant") {
        copy[copy.length - 1] = { ...last, content: MSG_APPLIED_TO_DOC };
      }
      return copy;
    });
    setError(null);
  }

  function rejectSuggestion() {
    if (!pendingSuggestion) return;
    if (pendingSuggestion.inline) {
      rejectStagedSuggestion();
    }
    setPendingSuggestion(null);
    setTurns((prev) => {
      if (prev.length === 0) return prev;
      const copy = [...prev];
      const last = copy[copy.length - 1];
      if (last?.role === "assistant") {
        copy[copy.length - 1] = {
          ...last,
          content: "Tracked rewrite suggestion discarded.",
        };
      }
      return copy;
    });
    setError(null);
  }

  useEffect(() => {
    return subscribeStagedSuggestion((active) => {
      if (!active) {
        setPendingSuggestion(null);
      }
    });
  }, [subscribeStagedSuggestion]);

  return (
    <div className="flex h-full min-h-0 flex-col border-l border-zinc-200 bg-gradient-to-b from-white to-zinc-50/80 dark:border-surface-border dark:from-surface dark:to-surface-raised">
      <div className="flex shrink-0 items-start gap-2 border-b border-zinc-200/90 px-3 py-2.5 dark:border-surface-border">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent dark:bg-accent/15">
          <Sparkles className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold leading-tight text-zinc-900 dark:text-zinc-100">
            Assistant
          </h2>
          <p className="mt-0.5 text-[11px] leading-snug text-zinc-500 dark:text-zinc-500">
            AI can apply instantly or stage tracked suggestions with Accept/Reject. Paste adds context blocks.
          </p>
        </div>
        {turns.length > 0 && (
          <button
            type="button"
            onClick={clearConversation}
            className="shrink-0 rounded-md p-1.5 text-zinc-400 transition hover:bg-zinc-200/80 hover:text-zinc-700 dark:hover:bg-surface-overlay dark:hover:text-zinc-200"
            title="Clear conversation"
            aria-label="Clear conversation"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div
        className="min-h-0 flex-1 overflow-y-auto px-3 py-3"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        {turns.length === 0 && (
          <div className="rounded-xl border border-dashed border-zinc-200/90 bg-zinc-50/50 p-3 dark:border-surface-border dark:bg-surface-overlay/40">
            <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
              Context blocks
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-500">
              <strong className="font-medium text-zinc-700 dark:text-zinc-400">Paste</strong> into
              the box below to attach text as context (not into the prompt). Use{" "}
              <strong className="font-medium text-zinc-700 dark:text-zinc-400">Add selection</strong>{" "}
              for the current highlight. Turn on editor selection to replace the selection when you
              send; otherwise the model updates the full document. Questions: it answers without
              changing the doc when appropriate.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {QUICK_PROMPTS.map((label) => (
                <button
                  key={label}
                  type="button"
                  disabled={streaming}
                  onClick={() => {
                    setInput(label);
                    textareaRef.current?.focus();
                  }}
                  className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] text-zinc-700 transition hover:border-accent/40 hover:bg-accent/5 hover:text-zinc-900 disabled:opacity-50 dark:border-surface-border dark:bg-surface-raised dark:text-zinc-300 dark:hover:border-accent/30 dark:hover:bg-surface-overlay dark:hover:text-zinc-100"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        <ul className="space-y-3">
          {turns.map((m, i) => {
            const isUser = m.role === "user";
            const isLast = i === turns.length - 1;
            const isThinking =
              !isUser &&
              streaming &&
              isLast &&
              m.content === "";

            return (
              <li
                key={i}
                className={`flex ${isUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[min(100%,20rem)] rounded-2xl px-3 py-2 text-xs shadow-sm ${
                    isUser
                      ? "rounded-br-md border border-emerald-200/80 bg-emerald-50 text-zinc-900 dark:border-emerald-800/50 dark:bg-emerald-950/35 dark:text-zinc-100"
                      : "rounded-bl-md border border-zinc-200/90 bg-white text-zinc-800 dark:border-surface-border dark:bg-surface-overlay dark:text-zinc-200"
                  }`}
                >
                  <div
                    className={`mb-1 text-[10px] font-semibold uppercase tracking-wide ${
                      isUser
                        ? "text-emerald-700 dark:text-emerald-400/90"
                        : "text-zinc-500 dark:text-zinc-500"
                    }`}
                  >
                    {isUser ? "You" : "Assistant"}
                  </div>
                  {isThinking ? (
                    <div className="flex items-center gap-1.5 py-0.5 text-zinc-500 dark:text-zinc-500">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                      <span className="text-[11px]">Writing…</span>
                    </div>
                  ) : (
                    <pre className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed">
                      {m.content}
                    </pre>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        <div ref={bottomRef} />
      </div>

      {error && (
        <div
          className="shrink-0 border-t border-red-200/90 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-900/40 dark:bg-red-950/35 dark:text-red-300"
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="shrink-0 space-y-2 border-t border-zinc-200/90 bg-white/90 p-3 backdrop-blur-sm dark:border-surface-border dark:bg-surface-raised/95">
        {contextBlocks.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-600">
              Context
            </span>
            <ul className="max-h-32 space-y-1.5 overflow-y-auto">
              {contextBlocks.map((b) => (
                <li
                  key={b.id}
                  className="group flex items-start gap-2 rounded-lg border border-zinc-200/90 bg-zinc-50/90 px-2 py-1.5 dark:border-surface-border dark:bg-surface-overlay/80"
                >
                  <GripVertical
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-400"
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-medium text-accent dark:text-blue-400">
                      {b.source === "paste" ? "Pasted" : "From selection"}
                    </div>
                    <p className="line-clamp-3 text-[11px] leading-snug text-zinc-700 dark:text-zinc-300">
                      {b.text}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setContextBlocks((prev) => prev.filter((x) => x.id !== b.id))
                    }
                    className="shrink-0 rounded p-1 text-zinc-400 opacity-0 transition hover:bg-zinc-200 hover:text-zinc-700 group-hover:opacity-100 dark:hover:bg-surface-raised dark:hover:text-zinc-200"
                    aria-label="Remove context"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={addSelectionAsContext}
            disabled={streaming || !getSelectionText().trim()}
            className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2 py-1 text-[11px] font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-40 dark:border-surface-border dark:text-zinc-300 dark:hover:bg-surface-overlay"
          >
            <TextSelect className="h-3.5 w-3.5" />
            Add selection
          </button>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-500">
              Replace selection
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={useSelection}
              aria-label="When on, AI replaces the current selection; when off, full document"
              onClick={() => setUseSelection((v) => !v)}
              className={`relative inline-flex h-6 w-10 shrink-0 rounded-full transition-colors focus-visible:outline focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 dark:focus-visible:ring-offset-surface-raised ${
                useSelection ? "bg-accent" : "bg-zinc-200 dark:bg-zinc-700"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow transition-transform ${
                  useSelection ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-500">
            Track changes (review first)
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={reviewBeforeApply}
            aria-label="When on, AI rewrites are staged as accept/reject suggestions"
            onClick={() => setReviewBeforeApply((v) => !v)}
            className={`relative inline-flex h-6 w-10 shrink-0 rounded-full transition-colors focus-visible:outline focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 dark:focus-visible:ring-offset-surface-raised ${
              reviewBeforeApply ? "bg-accent" : "bg-zinc-200 dark:bg-zinc-700"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow transition-transform ${
                reviewBeforeApply ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
        {pendingSuggestion && !pendingSuggestion.inline && (
          <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-2 dark:border-amber-900/50 dark:bg-amber-950/25">
            <p className="text-[11px] leading-relaxed text-amber-900 dark:text-amber-200">
              {pendingSuggestion.inline
                ? "Inline tracked change inserted in the editor. Accept to keep the new text, or reject to restore old text."
                : `AI suggestion ready (${pendingSuggestion.target.type === "document" ? "whole document" : "selection"}). Accept to apply, or reject to discard.`}
            </p>
            {pendingSuggestion.diffPreview.length > 0 && (
              <div className="mt-2 max-h-40 overflow-auto rounded border border-amber-200/70 bg-white/75 p-1.5 dark:border-amber-900/40 dark:bg-surface-overlay/70">
                {pendingSuggestion.diffPreview.map((line, idx) => {
                  const added = line.startsWith("+ ");
                  const removed = line.startsWith("- ");
                  return (
                    <p
                      key={`${idx}-${line}`}
                      className={`font-mono text-[10px] leading-relaxed ${
                        added
                          ? "text-emerald-700 dark:text-emerald-300"
                          : removed
                            ? "text-rose-700 dark:text-rose-300"
                            : "text-zinc-600 dark:text-zinc-400"
                      }`}
                    >
                      {line}
                    </p>
                  );
                })}
              </div>
            )}
            <div className="mt-2 flex gap-1.5">
              <button
                type="button"
                onClick={acceptSuggestion}
                className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-100 px-2 py-1 text-[11px] font-medium text-emerald-900 transition hover:bg-emerald-200 dark:border-emerald-800/70 dark:bg-emerald-900/30 dark:text-emerald-200 dark:hover:bg-emerald-900/45"
              >
                <Check className="h-3.5 w-3.5" />
                Accept
              </button>
              <button
                type="button"
                onClick={rejectSuggestion}
                className="inline-flex items-center gap-1 rounded-md border border-zinc-300 bg-white px-2 py-1 text-[11px] font-medium text-zinc-800 transition hover:bg-zinc-100 dark:border-surface-border dark:bg-surface-raised dark:text-zinc-200 dark:hover:bg-surface-overlay"
              >
                <X className="h-3.5 w-3.5" />
                Reject
              </button>
            </div>
          </div>
        )}
        <p className="text-[10px] leading-snug text-zinc-500 dark:text-zinc-600">
          {useSelection
            ? "With a selection in the editor, the reply replaces that range. Paste in the box adds context only."
            : "Full document will be replaced by the model output (unless the reply is a chat-only answer)."}
        </p>

        <div className="space-y-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-600">
            Tools
          </span>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              disabled={streaming}
              onClick={() => runTool("fix-grammar")}
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-zinc-800 transition hover:border-accent/40 hover:bg-accent/5 disabled:opacity-40 dark:border-surface-border dark:bg-surface-raised dark:text-zinc-200 dark:hover:bg-surface-overlay"
              title="Runs /fix-grammar on the selection or whole document"
            >
              <SpellCheck className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden />
              Fix grammar
            </button>
            <button
              type="button"
              disabled={streaming}
              onClick={() => runTool("clean-formatting")}
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-zinc-800 transition hover:border-accent/40 hover:bg-accent/5 disabled:opacity-40 dark:border-surface-border dark:bg-surface-raised dark:text-zinc-200 dark:hover:bg-surface-overlay"
              title="Runs /clean-formatting — paragraphs, lists, bold, italic, headings"
            >
              <ListTree className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden />
              Clean formatting
            </button>
            <button
              type="button"
              disabled={streaming}
              onClick={() => runTool("math-equations")}
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-zinc-800 transition hover:border-accent/40 hover:bg-accent/5 disabled:opacity-40 dark:border-surface-border dark:bg-surface-raised dark:text-zinc-200 dark:hover:bg-surface-overlay"
              title="Runs /math — KaTeX LaTeX in $…$ or $$…$$ delimiters"
            >
              <Sigma className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden />
              Math
            </button>
            <button
              type="button"
              disabled={streaming}
              onClick={() => runTool("research-paper")}
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-zinc-800 transition hover:border-accent/40 hover:bg-accent/5 disabled:opacity-40 dark:border-surface-border dark:bg-surface-raised dark:text-zinc-200 dark:hover:bg-surface-overlay"
              title="Runs /research-paper — Times 12pt, justified, captions, references (IEEE/APA/MLA)"
            >
              <BookOpen className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden />
              Research paper
            </button>
            <button
              type="button"
              disabled={streaming}
              onClick={() => runTool("citation-reference-check")}
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-zinc-800 transition hover:border-accent/40 hover:bg-accent/5 disabled:opacity-40 dark:border-surface-border dark:bg-surface-raised dark:text-zinc-200 dark:hover:bg-surface-overlay"
              title="Runs /citations — checks in-text citations, references, duplicates, style consistency"
            >
              <LibraryBig className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden />
              Citations
            </button>
          </div>
          <p className="text-[10px] text-zinc-500 dark:text-zinc-600">
            Or type{" "}
            <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-[10px] dark:bg-surface-overlay">
              /fix-grammar
            </code>
            ,{" "}
            <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-[10px] dark:bg-surface-overlay">
              /clean-formatting
            </code>
            ,{" "}
            <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-[10px] dark:bg-surface-overlay">
              /math
            </code>
            ,{" "}
            <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-[10px] dark:bg-surface-overlay">
              /research-paper
            </code>{" "}
            or{" "}
            <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-[10px] dark:bg-surface-overlay">
              /citations
            </code>{" "}
            in the box.
          </p>
        </div>

        <div className="relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onPaste={onPasteComposer}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            placeholder="/fix-grammar · /clean-formatting · /math · /research-paper · /citations · or any instruction…"
            rows={3}
            disabled={streaming}
            className="min-h-[80px] w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-2.5 pr-12 text-sm text-zinc-900 shadow-inner placeholder:text-zinc-400 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 disabled:opacity-60 dark:border-surface-border dark:bg-surface-overlay dark:text-zinc-100 dark:placeholder:text-zinc-600 dark:focus:ring-accent/20"
          />
          <button
            type="button"
            onClick={() => void send()}
            disabled={streaming || !input.trim()}
            className="absolute bottom-2 right-2 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-white shadow-sm transition hover:bg-accent-muted disabled:cursor-not-allowed disabled:opacity-40"
            title="Send (Enter)"
            aria-label="Send message"
          >
            {streaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>

        <p className="text-center text-[10px] text-zinc-400 dark:text-zinc-600">
          Enter to send · Shift+Enter new line · Paste = context (Shift+paste = into message)
        </p>

        <button
          type="button"
          disabled={!lastAssistant.trim() || streaming}
          onClick={() => void copyLastReply()}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-zinc-200 py-2 text-[11px] font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-40 dark:border-surface-border dark:text-zinc-300 dark:hover:bg-surface-overlay"
        >
          <Copy className="h-3.5 w-3.5" />
          {copied ? "Copied" : "Copy last reply"}
        </button>
      </div>
    </div>
  );
});
