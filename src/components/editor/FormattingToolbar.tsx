"use client";

import type { Editor } from "@tiptap/core";
import { useEffect, useReducer } from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Baseline,
  BetweenHorizontalStart,
  ChevronDown,
  Highlighter,
  Image as ImageIcon,
  IndentDecrease,
  IndentIncrease,
  LayoutTemplate,
  Link2,
  List,
  ListOrdered,
  ListTodo,
  Minus,
  PaintBucket,
  Palette,
  Pilcrow,
  RemoveFormatting,
  Strikethrough as StrikethroughIcon,
  Subscript as SubIcon,
  Superscript as SupIcon,
  Table2,
  Type,
  Underline,
} from "lucide-react";
import {
  FONT_FAMILIES,
  FONT_SIZES,
  HIGHLIGHT_PRESETS,
  LINE_HEIGHTS,
  PARA_SPACING,
} from "./formattingConstants";

type Props = {
  editor: Editor;
  onOpenPageSetup?: () => void;
};

function useEditorRerender(editor: Editor | null) {
  const [, tick] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    if (!editor) return;
    const fn = () => tick();
    editor.on("selectionUpdate", fn);
    editor.on("transaction", fn);
    return () => {
      editor.off("selectionUpdate", fn);
      editor.off("transaction", fn);
    };
  }, [editor]);
}

function clearFormatting(editor: Editor) {
  editor.chain().focus().unsetAllMarks().run();
  editor.chain().focus().unsetHighlight().run();
  editor
    .chain()
    .focus()
    .setTextAlign("left")
    .updateAttributes("paragraph", {
      indent: 0,
      lineHeight: null,
      marginTop: null,
      marginBottom: null,
    })
    .run();
}

function currentFontSize(editor: Editor): string {
  const { fontSize } = editor.getAttributes("textStyle");
  if (typeof fontSize === "string" && fontSize) return fontSize;
  return "16px";
}

function bumpFontSize(editor: Editor, delta: number) {
  const cur = currentFontSize(editor);
  const idx = FONT_SIZES.indexOf(cur as (typeof FONT_SIZES)[number]);
  const i = idx === -1 ? FONT_SIZES.indexOf("16px") : idx;
  const next = Math.min(FONT_SIZES.length - 1, Math.max(0, i + delta));
  editor.chain().focus().setFontSize(FONT_SIZES[next]).run();
}

function Btn({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`inline-flex h-8 min-w-[2rem] shrink-0 items-center justify-center rounded border px-1.5 text-xs transition ${
        active
          ? "border-accent bg-blue-500/20 text-blue-200"
          : "border-transparent bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
      } ${disabled ? "pointer-events-none opacity-40" : ""}`}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <div className="mx-1 h-6 w-px shrink-0 bg-zinc-700" aria-hidden />;
}

function textAlignValue(editor: Editor): string | null | undefined {
  if (editor.isActive("heading")) return editor.getAttributes("heading").textAlign;
  return editor.getAttributes("paragraph").textAlign;
}

export function FormattingToolbar({ editor, onOpenPageSetup }: Props) {
  useEditorRerender(editor);

  const ta = textAlignValue(editor);

  const p = editor.getAttributes("paragraph") as {
    indent?: number;
    lineHeight?: string | null;
    marginTop?: string | null;
    marginBottom?: string | null;
  };

  return (
    <div className="w-full shrink-0 border-b border-zinc-700 bg-zinc-900/95 px-2 py-1.5">
      <div className="flex flex-wrap items-center gap-0.5">
        {onOpenPageSetup && (
          <>
            <Btn title="Page layout, columns, margins, header & footer" onClick={onOpenPageSetup}>
              <LayoutTemplate className="h-3.5 w-3.5" />
            </Btn>
            <Sep />
          </>
        )}
        <Btn
          title="Bold (Ctrl+B)"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <span className="font-bold">B</span>
        </Btn>
        <Btn
          title="Italic (Ctrl+I)"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <span className="italic">I</span>
        </Btn>
        <Btn
          title="Underline"
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <Underline className="h-3.5 w-3.5" />
        </Btn>
        <Btn
          title="Strikethrough"
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <StrikethroughIcon className="h-3.5 w-3.5" />
        </Btn>
        <Btn
          title="Superscript"
          active={editor.isActive("superscript")}
          onClick={() => editor.chain().focus().toggleSuperscript().run()}
        >
          <SupIcon className="h-3.5 w-3.5" />
        </Btn>
        <Btn
          title="Subscript"
          active={editor.isActive("subscript")}
          onClick={() => editor.chain().focus().toggleSubscript().run()}
        >
          <SubIcon className="h-3.5 w-3.5" />
        </Btn>

        <Sep />

        <label className="inline-flex h-8 items-center gap-1 rounded border border-zinc-700 bg-zinc-950 px-1.5 text-[11px] text-zinc-400">
          <Type className="h-3 w-3 shrink-0" />
          <select
            className="max-w-[120px] cursor-pointer bg-transparent text-zinc-200 outline-none"
            value={editor.getAttributes("textStyle").fontFamily ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              if (!v) editor.chain().focus().unsetFontFamily().run();
              else editor.chain().focus().setFontFamily(v).run();
            }}
          >
            <option value="">Font</option>
            {FONT_FAMILIES.map((f) => (
              <option key={f} value={f} style={{ fontFamily: f }}>
                {f}
              </option>
            ))}
          </select>
        </label>

        <label className="inline-flex h-8 items-center gap-1 rounded border border-zinc-700 bg-zinc-950 px-1.5 text-[11px] text-zinc-400">
          <select
            className="w-[4.5rem] cursor-pointer bg-transparent text-zinc-200 outline-none"
            value={
              FONT_SIZES.includes(currentFontSize(editor) as (typeof FONT_SIZES)[number])
                ? currentFontSize(editor)
                : ""
            }
            onChange={(e) => {
              const v = e.target.value;
              if (!v) editor.chain().focus().unsetFontSize().run();
              else editor.chain().focus().setFontSize(v).run();
            }}
          >
            <option value="">Size</option>
            {FONT_SIZES.map((s) => (
              <option key={s} value={s}>
                {s.replace("px", "")}
              </option>
            ))}
          </select>
        </label>

        <Btn title="Larger" onClick={() => bumpFontSize(editor, 1)}>
          <span className="text-[10px] font-semibold">A↑</span>
        </Btn>
        <Btn title="Smaller" onClick={() => bumpFontSize(editor, -1)}>
          <span className="text-[10px] font-semibold">A↓</span>
        </Btn>

        <Btn title="Clear formatting" onClick={() => clearFormatting(editor)}>
          <RemoveFormatting className="h-3.5 w-3.5" />
        </Btn>

        <Sep />

        <label
          className="relative inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded border border-zinc-700 bg-zinc-950"
          title="Text color"
        >
          <Palette className="pointer-events-none h-3.5 w-3.5 text-zinc-400" />
          <input
            type="color"
            className="absolute inset-0 cursor-pointer opacity-0"
            value={editor.getAttributes("textStyle").color || "#111827"}
            onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
          />
        </label>

        <div className="flex items-center gap-0.5">
          {HIGHLIGHT_PRESETS.map((c) => (
            <button
              key={c}
              type="button"
              title="Highlight"
              style={{ backgroundColor: c }}
              className="h-5 w-5 rounded border border-zinc-600"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editor.chain().focus().toggleHighlight({ color: c }).run()}
            />
          ))}
        </div>

        <label
          className="relative inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded border border-zinc-700 bg-zinc-950"
          title="Highlight color"
        >
          <Highlighter className="pointer-events-none h-3.5 w-3.5 text-zinc-400" />
          <input
            type="color"
            className="absolute inset-0 cursor-pointer opacity-0"
            defaultValue="#fef08a"
            onChange={(e) => editor.chain().focus().toggleHighlight({ color: e.target.value }).run()}
          />
        </label>

        <label
          className="relative inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded border border-zinc-700 bg-zinc-950"
          title="Text background"
        >
          <PaintBucket className="pointer-events-none h-3.5 w-3.5 text-zinc-400" />
          <input
            type="color"
            className="absolute inset-0 cursor-pointer opacity-0"
            defaultValue="#e5e7eb"
            onChange={(e) => editor.chain().focus().toggleHighlight({ color: e.target.value }).run()}
          />
        </label>

        <Sep />

        <Btn
          title="Align left"
          active={ta === "left" || ta == null}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
        >
          <AlignLeft className="h-3.5 w-3.5" />
        </Btn>
        <Btn
          title="Align center"
          active={ta === "center"}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
        >
          <AlignCenter className="h-3.5 w-3.5" />
        </Btn>
        <Btn
          title="Align right"
          active={ta === "right"}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
        >
          <AlignRight className="h-3.5 w-3.5" />
        </Btn>
        <Btn
          title="Justify"
          active={ta === "justify"}
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        >
          <AlignJustify className="h-3.5 w-3.5" />
        </Btn>

        <label className="inline-flex h-8 items-center gap-1 rounded border border-zinc-700 bg-zinc-950 px-1.5 text-[11px] text-zinc-400">
          <Baseline className="h-3 w-3" />
          <select
            className="max-w-[5rem] cursor-pointer bg-transparent text-zinc-200 outline-none"
            value={p.lineHeight ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              editor
                .chain()
                .focus()
                .updateAttributes("paragraph", { lineHeight: v || null })
                .run();
            }}
          >
            <option value="">Line</option>
            {LINE_HEIGHTS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className="inline-flex h-8 items-center gap-1 rounded border border-zinc-700 bg-zinc-950 px-1.5 text-[11px] text-zinc-400">
          <span className="shrink-0">Space↑</span>
          <select
            className="max-w-[4.5rem] cursor-pointer bg-transparent text-zinc-200 outline-none"
            value={p.marginTop ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              editor.chain().focus().updateAttributes("paragraph", { marginTop: v || null }).run();
            }}
          >
            <option value="">—</option>
            {PARA_SPACING.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className="inline-flex h-8 items-center gap-1 rounded border border-zinc-700 bg-zinc-950 px-1.5 text-[11px] text-zinc-400">
          <span className="shrink-0">Space↓</span>
          <select
            className="max-w-[4.5rem] cursor-pointer bg-transparent text-zinc-200 outline-none"
            value={p.marginBottom ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              editor
                .chain()
                .focus()
                .updateAttributes("paragraph", { marginBottom: v || null })
                .run();
            }}
          >
            <option value="">—</option>
            {PARA_SPACING.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <Btn
          title="Increase indent"
          onClick={() =>
            editor
              .chain()
              .focus()
              .updateAttributes("paragraph", { indent: Math.min(8, (p.indent ?? 0) + 1) })
              .run()
          }
        >
          <IndentIncrease className="h-3.5 w-3.5" />
        </Btn>
        <Btn
          title="Decrease indent"
          onClick={() =>
            editor
              .chain()
              .focus()
              .updateAttributes("paragraph", { indent: Math.max(0, (p.indent ?? 0) - 1) })
              .run()
          }
        >
          <IndentDecrease className="h-3.5 w-3.5" />
        </Btn>

        <Sep />

        <Btn
          title="Bullet list"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-3.5 w-3.5" />
        </Btn>
        <Btn
          title="Numbered list"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </Btn>
        <Btn
          title="Checklist"
          active={editor.isActive("taskList")}
          onClick={() => editor.chain().focus().toggleTaskList().run()}
        >
          <ListTodo className="h-3.5 w-3.5" />
        </Btn>

        <Sep />

        <label className="inline-flex h-8 items-center gap-1 rounded border border-zinc-700 bg-zinc-950 px-1.5 text-[11px] text-zinc-400">
          <Pilcrow className="h-3 w-3" />
          <select
            className="max-w-[7rem] cursor-pointer bg-transparent text-zinc-200 outline-none"
            value={
              editor.isActive("heading", { level: 1 })
                ? "h1"
                : editor.isActive("heading", { level: 2 })
                  ? "h2"
                  : editor.isActive("heading", { level: 3 })
                    ? "h3"
                    : "p"
            }
            onChange={(e) => {
              const v = e.target.value;
              const chain = editor.chain().focus();
              if (v === "p") chain.setParagraph().run();
              else if (v === "h1") chain.toggleHeading({ level: 1 }).run();
              else if (v === "h2") chain.toggleHeading({ level: 2 }).run();
              else if (v === "h3") chain.toggleHeading({ level: 3 }).run();
            }}
          >
            <option value="p">Normal</option>
            <option value="h1">Heading 1</option>
            <option value="h2">Heading 2</option>
            <option value="h3">Heading 3</option>
          </select>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </label>

        <Sep />

        <Btn
          title="Insert link"
          active={editor.isActive("link")}
          onClick={() => {
            const prev = editor.getAttributes("link").href as string | undefined;
            const url = typeof window !== "undefined" ? window.prompt("Link URL", prev || "https://") : null;
            if (url === null) return;
            if (url === "") {
              editor.chain().focus().unsetLink().run();
              return;
            }
            editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
          }}
        >
          <Link2 className="h-3.5 w-3.5" />
        </Btn>
        <Btn
          title="Insert image"
          onClick={() => {
            const url = typeof window !== "undefined" ? window.prompt("Image URL", "https://") : null;
            if (!url) return;
            editor.chain().focus().setImage({ src: url }).run();
          }}
        >
          <ImageIcon className="h-3.5 w-3.5" />
        </Btn>
        <Btn
          title="Insert table (3×3)"
          onClick={() =>
            editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
          }
        >
          <Table2 className="h-3.5 w-3.5" />
        </Btn>
        <Btn title="Horizontal line" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <Minus className="h-3.5 w-3.5" />
        </Btn>
        <Btn title="Page break" onClick={() => editor.chain().focus().setPageBreak().run()}>
          <BetweenHorizontalStart className="h-3.5 w-3.5" />
        </Btn>
      </div>
    </div>
  );
}
