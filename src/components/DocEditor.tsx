"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DOMSerializer } from "prosemirror-model";
import { normalizeAiOutput } from "@/lib/aiDocumentApply";
import { loadDocumentHtml, saveDocumentHtml } from "@/lib/settings";
import type { DocumentLayout } from "@/lib/documentLayout";
import { loadLineNumbersPref, saveLineNumbersPref } from "@/lib/manuscriptHelpers";
import type { AiToolId } from "@/lib/aiTools";
import { createEditorExtensions } from "@/tiptap-extensions/editorExtensions";
import { FormattingToolbar } from "@/components/editor/FormattingToolbar";
import { SelectionBubbleMenu } from "@/components/editor/SelectionBubbleMenu";

export type SelectionRange = { from: number; to: number };
export type OutlineItem = { id: string; level: number; title: string; from: number; to: number };
type ChangeDecision = "pending" | "accepted" | "rejected";
type StagedEntry = { kind: "same"; line: string } | { kind: "change"; id: number; oldLine: string; newLine: string };

export type EditorApi = {
  getHtml: () => string;
  setHtml: (html: string) => void;
  getSelectionText: () => string;
  /** Current selection range, or null if caret only. */
  getSelectionRange: () => SelectionRange | null;
  insertAtCursor: (text: string) => void;
  /**
   * Replace the whole document or a character range with parsed HTML (TipTap).
   */
  applyAiHtml: (
    html: string,
    target: { type: "document" } | { type: "range"; from: number; to: number }
  ) => void;
  stageAiSuggestion: (
    html: string,
    target: { type: "document" } | { type: "range"; from: number; to: number }
  ) => boolean;
  acceptStagedSuggestion: () => boolean;
  rejectStagedSuggestion: () => boolean;
  hasStagedSuggestion: () => boolean;
  subscribeStagedSuggestion: (listener: (active: boolean) => void) => () => void;
  getDocumentOutline: () => OutlineItem[];
  focusRange: (from: number, to: number) => void;
};

type Props = {
  className?: string;
  layout: DocumentLayout;
  onOpenPageSetup?: () => void;
  onReady?: (api: EditorApi) => void;
  /** Run built-in AI tools (grammar, formatting) from the selection bubble menu. */
  onAiTool?: (tool: AiToolId) => void;
};

export function DocEditor({ className, layout, onOpenPageSetup, onReady, onAiTool }: Props) {
  const editorRef = useRef<Editor | null>(null);
  const reviewPanelContainerRef = useRef<HTMLDivElement | null>(null);
  const reviewDragRef = useRef<{ dx: number; dy: number } | null>(null);
  const stagedListenersRef = useRef(new Set<(active: boolean) => void>());
  const stagedRef = useRef<{
    from: number;
    to: number;
    oldHtml: string;
    newHtml: string;
    entries: StagedEntry[];
    decisions: Record<number, ChangeDecision>;
  } | null>(null);
  const [stagedAnchor, setStagedAnchor] = useState<{ from: number; to: number } | null>(null);
  const [reviewPanelPos, setReviewPanelPos] = useState<{ top: number; left: number } | null>(null);
  const [draggingReviewPanel, setDraggingReviewPanel] = useState(false);
  const [stagedTick, setStagedTick] = useState(0);
  const [activeChangeId, setActiveChangeId] = useState<number | null>(null);
  const [lineNumbers, setLineNumbers] = useState(loadLineNumbersPref);
  const notifyStagedState = useCallback((active: boolean) => {
    stagedListenersRef.current.forEach((listener) => listener(active));
  }, []);
  const toggleLineNumbers = useCallback(() => {
    setLineNumbers((v) => {
      const next = !v;
      saveLineNumbersPref(next);
      return next;
    });
  }, []);

  const editorOptions = useMemo(
    () => ({
      extensions: createEditorExtensions("Start writing, or import a .docx file…"),
      content: "",
      editorProps: {
        attributes: {
          class: "doc-prose-mirror",
        },
      },
      immediatelyRender: false as const,
    }),
    []
  );

  const editor = useEditor(editorOptions, []);

  editorRef.current = editor;

  useEffect(() => {
    if (!editor) return;
    const saved = loadDocumentHtml();
    if (saved) {
      editor.commands.setContent(saved);
    }
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    const handler = () => {
      saveDocumentHtml(editor.getHTML());
    };
    editor.on("update", handler);
    return () => {
      editor.off("update", handler);
    };
  }, [editor]);

  const getHtml = useCallback(() => editorRef.current?.getHTML() ?? "", []);
  const setHtml = useCallback((html: string) => {
    editorRef.current?.commands.setContent(html);
  }, []);
  const getSelectionText = useCallback(() => {
    const ed = editorRef.current;
    if (!ed) return "";
    const { from, to } = ed.state.selection;
    if (from === to) return "";
    return ed.state.doc.textBetween(from, to, " ");
  }, []);
  const getSelectionRange = useCallback((): SelectionRange | null => {
    const ed = editorRef.current;
    if (!ed) return null;
    const { from, to } = ed.state.selection;
    if (from === to) return null;
    return { from, to };
  }, []);
  const getSelectionHtml = useCallback((from: number, to: number): string => {
    const ed = editorRef.current;
    if (!ed) return "";
    const slice = ed.state.doc.slice(from, to);
    const serializer = DOMSerializer.fromSchema(ed.state.schema);
    const frag = serializer.serializeFragment(slice.content);
    const wrap = document.createElement("div");
    wrap.appendChild(frag);
    return wrap.innerHTML;
  }, []);
  const getDocumentOutline = useCallback((): OutlineItem[] => {
    const ed = editorRef.current;
    if (!ed) return [];
    const out: OutlineItem[] = [];
    let idx = 1;
    ed.state.doc.descendants((node, pos) => {
      if (node.type.name !== "heading") return true;
      const level = typeof node.attrs.level === "number" ? node.attrs.level : 1;
      const title = node.textContent.trim() || `Untitled section ${idx}`;
      out.push({
        id: `heading-${idx++}`,
        level,
        title,
        from: pos,
        to: pos + node.nodeSize,
      });
      return true;
    });
    return out;
  }, []);
  const focusRange = useCallback((from: number, to: number) => {
    const ed = editorRef.current;
    if (!ed) return;
    ed.chain().focus().setTextSelection({ from, to }).run();
  }, []);
  const applyAiHtml = useCallback(
    (
      html: string,
      target: { type: "document" } | { type: "range"; from: number; to: number }
    ) => {
      const ed = editorRef.current;
      if (!ed) return;
      const normalized = normalizeAiOutput(html);
      if (target.type === "document") {
        ed.chain().focus().setContent(normalized).run();
        return;
      }
      ed.chain().focus().insertContentAt({ from: target.from, to: target.to }, normalized).run();
    },
    []
  );
  const getDefaultReviewPanelPos = useCallback(() => {
    const host = reviewPanelContainerRef.current;
    const width = host?.clientWidth ?? 900;
    return { top: 8, left: Math.max(8, Math.round((width - 320) / 2)) };
  }, []);
  const esc = useCallback(
    (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"),
    []
  );
  const renderStagedPreviewHtml = useCallback(
    (staged: { entries: StagedEntry[]; decisions: Record<number, ChangeDecision> }) => {
      const rows: string[] = [
        `<p style="margin:0.25em 0 0.1em 0; font-size:11px; color:#92400e;"><strong>AI suggestion</strong> (review changes below)</p>`,
      ];
      for (const entry of staged.entries) {
        if (entry.kind === "same") {
          rows.push(
            `<p style="margin:0.08em 0; font-size:12px; color:#6b7280;">${esc(entry.line)}</p>`
          );
          continue;
        }
        const decision = staged.decisions[entry.id] ?? "pending";
        const label =
          decision === "accepted"
            ? "Accepted"
            : decision === "rejected"
              ? "Rejected"
              : `Change ${entry.id}`;
        rows.push(
          `<p style="margin:0.14em 0 0.05em 0; font-size:11px; color:#92400e;"><strong>${label}</strong></p>`
        );
        if (decision === "accepted") {
          rows.push(
            `<p style="margin:0.04em 0 0.14em 0; font-size:12px;"><span style="color:#16a34a;">+ </span><span style="background:#dcfce7; color:#166534; padding:0 2px; border-radius:2px;">${esc(entry.newLine)}</span></p>`
          );
          continue;
        }
        if (decision === "rejected") {
          rows.push(
            `<p style="margin:0.04em 0 0.14em 0; font-size:12px;"><span style="color:#9ca3af;">= </span><span style="color:#6b7280;">${esc(entry.oldLine)}</span></p>`
          );
          continue;
        }
        rows.push(
          `<p style="margin:0.04em 0; font-size:12px;"><span style="color:#9ca3af;">- </span><span style="text-decoration:line-through; color:#9ca3af;">${esc(entry.oldLine)}</span></p>`
        );
        rows.push(
          `<p style="margin:0.04em 0 0.14em 0; font-size:12px;"><span style="color:#16a34a;">+ </span><span style="background:#dcfce7; color:#166534; padding:0 2px; border-radius:2px;">${esc(entry.newLine)}</span></p>`
        );
      }
      return rows.join("");
    },
    [esc]
  );
  const applyStagedPreview = useCallback(
    (staged: {
      from: number;
      to: number;
      entries: StagedEntry[];
      decisions: Record<number, ChangeDecision>;
    }) => {
      const ed = editorRef.current;
      if (!ed) return false;
      const previewHtml = renderStagedPreviewHtml(staged);
      ed.chain().focus().insertContentAt({ from: staged.from, to: staged.to }, previewHtml).run();
      const insertedEnd = ed.state.selection.from;
      staged.to = insertedEnd;
      setStagedAnchor({ from: staged.from, to: insertedEnd });
      setReviewPanelPos((prev) => prev ?? getDefaultReviewPanelPos());
      return true;
    },
    [renderStagedPreviewHtml, getDefaultReviewPanelPos]
  );
  const finalizeStagedDecisions = useCallback((): boolean => {
    const ed = editorRef.current;
    const staged = stagedRef.current;
    if (!ed || !staged) return false;
    const lines: string[] = [];
    for (const entry of staged.entries) {
      if (entry.kind === "same") {
        lines.push(entry.line);
        continue;
      }
      const decision = staged.decisions[entry.id] ?? "pending";
      lines.push(decision === "accepted" ? entry.newLine : entry.oldLine);
    }
    const merged = normalizeAiOutput(lines.join("\n"));
    ed.chain().focus().insertContentAt({ from: staged.from, to: staged.to }, merged).run();
    stagedRef.current = null;
    setStagedAnchor(null);
    setReviewPanelPos(null);
    setDraggingReviewPanel(false);
    setStagedTick((v) => v + 1);
    setActiveChangeId(null);
    notifyStagedState(false);
    return true;
  }, [notifyStagedState]);
  const setChangeDecision = useCallback(
    (id: number, decision: Exclude<ChangeDecision, "pending">): boolean => {
      const staged = stagedRef.current;
      if (!staged) return false;
      staged.decisions[id] = decision;
      const allDecided = staged.entries.every(
        (entry) => entry.kind === "same" || staged.decisions[entry.id] !== "pending"
      );
      if (allDecided) return finalizeStagedDecisions();
      const pendingIds = staged.entries
        .filter((entry): entry is Extract<StagedEntry, { kind: "change" }> => entry.kind === "change")
        .map((entry) => entry.id)
        .filter((changeId) => staged.decisions[changeId] === "pending");
      if (pendingIds.length > 0) {
        setActiveChangeId(pendingIds[0]);
      }
      const ok = applyStagedPreview(staged);
      if (ok) setStagedTick((v) => v + 1);
      return ok;
    },
    [applyStagedPreview, finalizeStagedDecisions]
  );
  const stageAiSuggestion = useCallback(
    (
      html: string,
      target: { type: "document" } | { type: "range"; from: number; to: number }
    ): boolean => {
      const ed = editorRef.current;
      if (!ed || stagedRef.current) return false;
      if (target.type === "document") return false;

      const oldText = ed.state.doc.textBetween(target.from, target.to, "\n");
      const normalizedNew = normalizeAiOutput(html);
      const plainNew = normalizedNew
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/(p|div|li|h1|h2|h3|h4|h5|h6|blockquote|tr)>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/\u00a0/g, " ");
      const esc = (v: string) =>
        v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const oldLines = oldText.split(/\r?\n/).map((s) => s.trim());
      const newLines = plainNew.split(/\r?\n/).map((s) => s.trim());
      const total = Math.max(oldLines.length, newLines.length);
      const entries: StagedEntry[] = [];
      let changeId = 1;
      const decisions: Record<number, ChangeDecision> = {};
      for (let i = 0; i < total; i += 1) {
        const oldLine = oldLines[i] ?? "";
        const newLine = newLines[i] ?? "";
        if (!oldLine && !newLine) continue;
        if (oldLine === newLine) {
          entries.push({ kind: "same", line: oldLine });
          continue;
        }
        entries.push({ kind: "change", id: changeId, oldLine, newLine });
        decisions[changeId] = "pending";
        changeId += 1;
      }
      if (entries.length === 0) {
        entries.push({ kind: "same", line: "(empty selection)" });
      }
      const hasChanges = entries.some((entry) => entry.kind === "change");
      if (!hasChanges) return false;
      stagedRef.current = {
        from: target.from,
        to: target.to,
        oldHtml: getSelectionHtml(target.from, target.to),
        newHtml: normalizedNew,
        entries,
        decisions,
      };
      const ok = applyStagedPreview(stagedRef.current);
      if (ok) {
        setStagedTick((v) => v + 1);
        notifyStagedState(true);
        const firstChange = entries.find(
          (entry): entry is Extract<StagedEntry, { kind: "change" }> => entry.kind === "change"
        );
        setActiveChangeId(firstChange?.id ?? null);
      }
      return ok;
    },
    [applyStagedPreview, notifyStagedState, getSelectionHtml]
  );
  const acceptStagedSuggestion = useCallback((): boolean => {
    const ed = editorRef.current;
    const staged = stagedRef.current;
    if (!ed || !staged) return false;
    ed.chain().focus().insertContentAt({ from: staged.from, to: staged.to }, staged.newHtml).run();
    stagedRef.current = null;
    setStagedAnchor(null);
    setReviewPanelPos(null);
    setDraggingReviewPanel(false);
    setStagedTick((v) => v + 1);
    setActiveChangeId(null);
    notifyStagedState(false);
    return true;
  }, [notifyStagedState]);
  const rejectStagedSuggestion = useCallback((): boolean => {
    const ed = editorRef.current;
    const staged = stagedRef.current;
    if (!ed || !staged) return false;
    ed.chain().focus().insertContentAt({ from: staged.from, to: staged.to }, staged.oldHtml).run();
    stagedRef.current = null;
    setStagedAnchor(null);
    setReviewPanelPos(null);
    setDraggingReviewPanel(false);
    setStagedTick((v) => v + 1);
    setActiveChangeId(null);
    notifyStagedState(false);
    return true;
  }, [notifyStagedState]);
  const subscribeStagedSuggestion = useCallback((listener: (active: boolean) => void) => {
    stagedListenersRef.current.add(listener);
    listener(Boolean(stagedRef.current));
    return () => {
      stagedListenersRef.current.delete(listener);
    };
  }, []);
  const hasStagedSuggestion = useCallback(() => Boolean(stagedRef.current), []);
  const insertAtCursor = useCallback((text: string) => {
    const ed = editorRef.current;
    if (!ed) return;
    ed.chain().focus().insertContent(text).run();
  }, []);

  useEffect(() => {
    if (!editor || !onReady) return;
    onReady({
      getHtml,
      setHtml,
      getSelectionText,
      getSelectionRange,
      insertAtCursor,
      applyAiHtml,
      stageAiSuggestion,
      acceptStagedSuggestion,
      rejectStagedSuggestion,
      hasStagedSuggestion,
      subscribeStagedSuggestion,
      getDocumentOutline,
      focusRange,
    });
  }, [
    editor,
    onReady,
    getHtml,
    setHtml,
    getSelectionText,
    getSelectionRange,
    insertAtCursor,
    applyAiHtml,
    stageAiSuggestion,
    acceptStagedSuggestion,
    rejectStagedSuggestion,
    hasStagedSuggestion,
    subscribeStagedSuggestion,
    getDocumentOutline,
    focusRange,
  ]);

  useEffect(() => {
    if (!draggingReviewPanel) return;
    const onMove = (event: MouseEvent) => {
      const drag = reviewDragRef.current;
      const host = reviewPanelContainerRef.current;
      if (!drag || !host) return;
      const rect = host.getBoundingClientRect();
      const nextLeft = Math.max(8, Math.min(rect.width - 328, event.clientX - rect.left - drag.dx));
      const nextTop = Math.max(8, Math.min(rect.height - 56, event.clientY - rect.top - drag.dy));
      setReviewPanelPos({ left: nextLeft, top: nextTop });
    };
    const onUp = () => {
      reviewDragRef.current = null;
      setDraggingReviewPanel(false);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [draggingReviewPanel]);

  if (!editor) {
    return (
      <div className="flex flex-1 items-center justify-center text-zinc-500 text-sm">
        Loading editor…
      </div>
    );
  }

  const sheetPad = {
    paddingTop: layout.marginTop,
    paddingBottom: layout.marginBottom,
    paddingLeft: layout.marginLeft,
    paddingRight: layout.marginRight,
  };

  const showHeader = layout.headerText.trim().length > 0;
  const showFooter = layout.footerText.trim().length > 0;

  return (
    <div className={`flex min-h-0 w-full flex-1 flex-col ${className ?? ""}`}>
      <FormattingToolbar
        editor={editor}
        layout={layout}
        lineNumbers={lineNumbers}
        onToggleLineNumbers={toggleLineNumbers}
        onOpenPageSetup={onOpenPageSetup}
      />
      <SelectionBubbleMenu editor={editor} onAiTool={onAiTool} />
      <div
        data-onboarding="editor-canvas"
        ref={reviewPanelContainerRef}
        className="doc-page-scroll relative min-h-0 w-full flex-1 overflow-y-auto"
      >
        {stagedAnchor && (
          <div
            className="pointer-events-none absolute z-[80]"
            style={{
              top: reviewPanelPos?.top ?? getDefaultReviewPanelPos().top,
              left: reviewPanelPos?.left ?? getDefaultReviewPanelPos().left,
            }}
          >
            <div className="pointer-events-auto w-[20rem] rounded-md border border-zinc-200 bg-white/95 p-1.5 shadow-lg backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/95">
              {(() => {
                const changes = (stagedRef.current?.entries ?? []).filter(
                  (entry): entry is Extract<StagedEntry, { kind: "change" }> => entry.kind === "change"
                );
                const decisions = stagedRef.current?.decisions ?? {};
                const pendingIds = changes
                  .map((entry) => entry.id)
                  .filter((id) => decisions[id] === "pending");
                const decidedCount = changes.length - pendingIds.length;
                const currentId =
                  activeChangeId && changes.some((entry) => entry.id === activeChangeId)
                    ? activeChangeId
                    : (pendingIds[0] ?? changes[0]?.id ?? null);
                const currentIndex =
                  currentId == null ? -1 : changes.findIndex((entry) => entry.id === currentId);
                const current = currentIndex >= 0 ? changes[currentIndex] : null;
                const prevId = currentIndex > 0 ? changes[currentIndex - 1].id : null;
                const nextId =
                  currentIndex >= 0 && currentIndex < changes.length - 1
                    ? changes[currentIndex + 1].id
                    : null;
                return (
                  <>
                    <div
                      className={`mb-1 flex items-center justify-between rounded px-1 py-0.5 ${
                        draggingReviewPanel
                          ? "cursor-grabbing bg-zinc-100 dark:bg-zinc-800"
                          : "cursor-grab hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      }`}
                      onMouseDown={(event) => {
                        const host = reviewPanelContainerRef.current;
                        if (!host) return;
                        const rect = host.getBoundingClientRect();
                        const current = reviewPanelPos ?? getDefaultReviewPanelPos();
                        reviewDragRef.current = {
                          dx: event.clientX - rect.left - current.left,
                          dy: event.clientY - rect.top - current.top,
                        };
                        setDraggingReviewPanel(true);
                      }}
                      title="Drag to move review banner"
                    >
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        Inline review
                      </span>
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                        {decidedCount}/{changes.length} decided
                      </span>
                    </div>
                    {current ? (
                      <>
                        <div className="mb-1 flex items-center gap-1">
                          <button
                            type="button"
                            disabled={!prevId}
                            onClick={() => prevId && setActiveChangeId(prevId)}
                            className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-700 disabled:opacity-40 dark:bg-zinc-800 dark:text-zinc-200"
                            title="Previous change"
                          >
                            Prev
                          </button>
                          <span className="text-[10px] font-semibold text-zinc-700 dark:text-zinc-200">
                            Change {currentIndex + 1}
                          </span>
                          <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                            / {changes.length}
                          </span>
                          <button
                            type="button"
                            onClick={() => setChangeDecision(current.id, "accepted")}
                            className="ml-auto rounded bg-emerald-600 px-2 py-1 text-[10px] font-medium text-white transition hover:bg-emerald-700"
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            onClick={() => setChangeDecision(current.id, "rejected")}
                            className="rounded bg-zinc-100 px-2 py-1 text-[10px] font-medium text-zinc-800 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                          >
                            Reject
                          </button>
                          <button
                            type="button"
                            disabled={!nextId}
                            onClick={() => nextId && setActiveChangeId(nextId)}
                            className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-700 disabled:opacity-40 dark:bg-zinc-800 dark:text-zinc-200"
                            title="Next change"
                          >
                            Next
                          </button>
                        </div>
                        <p className="line-clamp-1 text-[10px] text-zinc-600 dark:text-zinc-400">
                          {current.oldLine || "(empty)"} to {current.newLine || "(empty)"}
                        </p>
                      </>
                    ) : (
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                        No pending inline changes.
                      </p>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )}
        <div
          className={`doc-page-sheet w-full min-h-full ${
            layout.orientation === "landscape" ? "doc-page-sheet--landscape" : "doc-page-sheet--portrait"
          }`}
          style={sheetPad}
        >
          {showHeader && (
            <header className="doc-zone-header mb-3 border-b border-zinc-200 pb-2 text-center text-[11pt] text-zinc-500 whitespace-pre-wrap">
              {layout.headerText}
            </header>
          )}
          <div
            className={`doc-column-body min-h-[12rem]${lineNumbers ? " doc-line-numbers" : ""}`}
            style={{
              columnCount: layout.columns,
              columnGap: layout.columns > 1 ? "1.25em" : undefined,
            }}
          >
            <EditorContent editor={editor} className="tiptap-editor" />
          </div>
          {showFooter && (
            <footer className="doc-zone-footer mt-3 border-t border-zinc-200 pt-2 text-center text-[11pt] text-zinc-500 whitespace-pre-wrap">
              {layout.footerText}
            </footer>
          )}
        </div>
      </div>
    </div>
  );
}
