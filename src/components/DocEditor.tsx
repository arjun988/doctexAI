"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { normalizeAiOutput } from "@/lib/aiDocumentApply";
import { loadDocumentHtml, saveDocumentHtml } from "@/lib/settings";
import type { DocumentLayout } from "@/lib/documentLayout";
import { createEditorExtensions } from "@/tiptap-extensions/editorExtensions";
import { FormattingToolbar } from "@/components/editor/FormattingToolbar";
import { SelectionBubbleMenu } from "@/components/editor/SelectionBubbleMenu";

export type SelectionRange = { from: number; to: number };

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
};

type Props = {
  className?: string;
  layout: DocumentLayout;
  onOpenPageSetup?: () => void;
  onReady?: (api: EditorApi) => void;
};

export function DocEditor({ className, layout, onOpenPageSetup, onReady }: Props) {
  const editorRef = useRef<Editor | null>(null);

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
  const insertAtCursor = useCallback((text: string) => {
    const ed = editorRef.current;
    if (!ed) return;
    ed.chain().focus().insertContent(text).run();
  }, []);

  useEffect(() => {
    if (!editor || !onReady) return;
    onReady({ getHtml, setHtml, getSelectionText, getSelectionRange, insertAtCursor, applyAiHtml });
  }, [editor, onReady, getHtml, setHtml, getSelectionText, getSelectionRange, insertAtCursor, applyAiHtml]);

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
      <FormattingToolbar editor={editor} onOpenPageSetup={onOpenPageSetup} />
      <SelectionBubbleMenu editor={editor} />
      <div className="doc-page-scroll min-h-0 w-full flex-1 overflow-y-auto">
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
            className="doc-column-body min-h-[12rem]"
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
