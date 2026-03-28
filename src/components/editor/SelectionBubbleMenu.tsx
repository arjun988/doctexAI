"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BubbleMenu } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import { LinkUrlDialog } from "@/components/editor/EditorDialogs";
import type { AiToolId } from "@/lib/aiTools";
import {
  Bold,
  BookOpen,
  ChevronDown,
  Highlighter,
  Italic,
  Link2,
  ListTree,
  Palette,
  Sigma,
  Sparkles,
  SpellCheck,
  Strikethrough,
  Underline,
} from "lucide-react";

type Props = {
  editor: Editor;
  onAiTool?: (tool: AiToolId) => void;
};

function B({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-700 transition hover:bg-zinc-200 dark:text-zinc-200 dark:hover:bg-zinc-700 ${
        active ? "bg-zinc-300 text-zinc-900 dark:bg-zinc-600 dark:text-white" : ""
      }`}
    >
      {children}
    </button>
  );
}

function AiToolsDropdown({ onAiTool }: { onAiTool: (tool: AiToolId) => void }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const positionMenu = () => {
    const t = triggerRef.current;
    if (!t) return;
    const r = t.getBoundingClientRect();
    setCoords({ top: r.bottom + 6, left: r.left });
  };

  useEffect(() => {
    if (!open) return;
    positionMenu();
    const onScroll = () => positionMenu();
    const onResize = () => positionMenu();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const el = e.target as Node;
      if (triggerRef.current?.contains(el) || menuRef.current?.contains(el)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const run = (tool: AiToolId) => {
    onAiTool(tool);
    setOpen(false);
  };

  const dropdown =
    open &&
    typeof document !== "undefined" &&
    createPortal(
      <div
        ref={menuRef}
        role="menu"
        aria-label="AI tools"
        className="fixed z-[9999] min-w-[12rem] overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 text-sm shadow-lg dark:border-zinc-600 dark:bg-zinc-900"
        style={{ top: coords.top, left: coords.left }}
      >
        <button
          type="button"
          role="menuitem"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => run("fix-grammar")}
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-zinc-800 transition hover:bg-emerald-50 dark:text-zinc-100 dark:hover:bg-emerald-950/50"
        >
          <SpellCheck className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span className="font-medium">Fix grammar</span>
        </button>
        <button
          type="button"
          role="menuitem"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => run("clean-formatting")}
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-zinc-800 transition hover:bg-sky-50 dark:text-zinc-100 dark:hover:bg-sky-950/50"
        >
          <ListTree className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
          <span className="font-medium">Clean formatting</span>
        </button>
        <button
          type="button"
          role="menuitem"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => run("math-equations")}
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-zinc-800 transition hover:bg-violet-50 dark:text-zinc-100 dark:hover:bg-violet-950/50"
        >
          <Sigma className="h-4 w-4 shrink-0 text-violet-600 dark:text-violet-400" />
          <span className="font-medium">Math equations</span>
        </button>
        <button
          type="button"
          role="menuitem"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => run("research-paper")}
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-zinc-800 transition hover:bg-amber-50 dark:text-zinc-100 dark:hover:bg-amber-950/50"
        >
          <BookOpen className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
          <span className="font-medium">Research paper</span>
        </button>
      </div>,
      document.body
    );

  return (
    <div className="relative flex shrink-0 items-center">
      <button
        ref={triggerRef}
        type="button"
        title="AI tools"
        aria-expanded={open}
        aria-haspopup="menu"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          setOpen((v) => !v);
        }}
        className={`inline-flex h-8 items-center gap-1 rounded-md border px-2 text-xs font-medium transition ${
          open
            ? "border-accent bg-blue-50 text-blue-900 dark:bg-blue-950/50 dark:text-blue-100"
            : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
        }`}
      >
        <Sparkles className="h-3.5 w-3.5" aria-hidden />
        <span>AI</span>
        <ChevronDown
          className={`h-3.5 w-3.5 opacity-70 transition ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      {dropdown}
    </div>
  );
}

export function SelectionBubbleMenu({ editor, onAiTool }: Props) {
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkInitialUrl, setLinkInitialUrl] = useState("");

  function openLinkDialog() {
    setLinkInitialUrl((editor.getAttributes("link").href as string | undefined) ?? "");
    setLinkDialogOpen(true);
  }

  return (
    <BubbleMenu
      editor={editor}
      shouldShow={({ editor: ed }) => !ed.state.selection.empty}
      tippyOptions={{ duration: 120, placement: "top" }}
      className="z-[70] flex items-center gap-0.5 rounded-lg border border-zinc-300 bg-white px-1 py-1 shadow-xl dark:border-zinc-600 dark:bg-zinc-900"
    >
      <B
        title="Bold"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="h-4 w-4" />
      </B>
      <B
        title="Italic"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-4 w-4" />
      </B>
      <B
        title="Underline"
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <Underline className="h-4 w-4" />
      </B>
      <B
        title="Strikethrough"
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough className="h-4 w-4" />
      </B>
      <div className="mx-0.5 h-5 w-px bg-zinc-300 dark:bg-zinc-600" />
      <B title="Link" active={editor.isActive("link")} onClick={openLinkDialog}>
        <Link2 className="h-4 w-4" />
      </B>
      <label className="relative inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-zinc-700 hover:bg-zinc-200 dark:text-zinc-200 dark:hover:bg-zinc-700">
        <Palette className="pointer-events-none h-4 w-4" />
        <input
          type="color"
          className="absolute inset-0 cursor-pointer opacity-0"
          value={editor.getAttributes("textStyle").color || "#111827"}
          onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
        />
      </label>
      <B
        title="Highlight"
        active={editor.isActive("highlight")}
        onClick={() => editor.chain().focus().toggleHighlight({ color: "#fef08a" }).run()}
      >
        <Highlighter className="h-4 w-4" />
      </B>
      {onAiTool && (
        <>
          <div className="mx-0.5 h-8 w-px shrink-0 bg-zinc-300 dark:bg-zinc-600" />
          <AiToolsDropdown onAiTool={onAiTool} />
        </>
      )}
      <LinkUrlDialog
        open={linkDialogOpen}
        onClose={() => setLinkDialogOpen(false)}
        initialUrl={linkInitialUrl}
        onApply={(url) => {
          if (url === "") {
            editor.chain().focus().unsetLink().run();
            return;
          }
          editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
        }}
      />
    </BubbleMenu>
  );
}
