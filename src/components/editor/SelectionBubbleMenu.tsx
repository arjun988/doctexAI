"use client";

import { BubbleMenu } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import type { AiToolId } from "@/lib/aiTools";
import {
  Bold,
  Highlighter,
  Italic,
  Link2,
  ListTree,
  Palette,
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

export function SelectionBubbleMenu({ editor, onAiTool }: Props) {
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
      <B
        title="Link"
        active={editor.isActive("link")}
        onClick={() => {
          const prev = editor.getAttributes("link").href as string | undefined;
          const url =
            typeof window !== "undefined" ? window.prompt("Link URL", prev || "https://") : null;
          if (url === null) return;
          if (url === "") {
            editor.chain().focus().unsetLink().run();
            return;
          }
          editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
        }}
      >
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
          <div className="mx-0.5 h-5 w-px bg-zinc-300 dark:bg-zinc-600" />
          <B
            title="AI: fix grammar & spelling"
            onClick={() => onAiTool("fix-grammar")}
          >
            <SpellCheck className="h-4 w-4" />
          </B>
          <B
            title="AI: clean formatting (paragraphs, lists, emphasis)"
            onClick={() => onAiTool("clean-formatting")}
          >
            <ListTree className="h-4 w-4" />
          </B>
        </>
      )}
    </BubbleMenu>
  );
}
