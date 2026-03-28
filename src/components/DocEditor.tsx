"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import { useCallback, useEffect, useRef } from "react";
import { loadDocumentHtml, saveDocumentHtml } from "@/lib/settings";

export type EditorApi = {
  getHtml: () => string;
  setHtml: (html: string) => void;
  getSelectionText: () => string;
  insertAtCursor: (text: string) => void;
};

type Props = {
  className?: string;
  onReady?: (api: EditorApi) => void;
};

export function DocEditor({ className, onReady }: Props) {
  const editorRef = useRef<Editor | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: "Start writing, or import a .docx file…",
      }),
      Link.configure({ openOnClick: true, autolink: true }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class: "prose prose-zinc max-w-none",
      },
    },
    immediatelyRender: false,
  });

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
  const insertAtCursor = useCallback((text: string) => {
    const ed = editorRef.current;
    if (!ed) return;
    ed.chain().focus().insertContent(text).run();
  }, []);

  useEffect(() => {
    if (!editor || !onReady) return;
    onReady({ getHtml, setHtml, getSelectionText, insertAtCursor });
  }, [editor, onReady, getHtml, setHtml, getSelectionText, insertAtCursor]);

  if (!editor) {
    return (
      <div className="flex flex-1 items-center justify-center text-zinc-500 text-sm">
        Loading editor…
      </div>
    );
  }

  return (
    <div className={className}>
      <EditorContent editor={editor} className="tiptap-editor" />
    </div>
  );
}
