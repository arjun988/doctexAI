"use client";

import type { Editor } from "@tiptap/core";
import { useEffect, useReducer, useRef, useState } from "react";
import { LinkUrlDialog, MathEquationDialog, TableInsertDialog } from "@/components/editor/EditorDialogs";
import { ManuscriptToolbar } from "@/components/editor/ManuscriptToolbar";
import type { DocumentLayout } from "@/lib/documentLayout";
import { parseMathSelection } from "@/lib/mathEquation";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Baseline,
  BetweenHorizontalStart,
  ChevronDown,
  Columns2,
  Highlighter,
  ImagePlus,
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
  Rows2,
  Sigma,
  Strikethrough as StrikethroughIcon,
  Subscript as SubIcon,
  Superscript as SupIcon,
  Table2,
  Trash2,
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
  layout: DocumentLayout;
  lineNumbers: boolean;
  onToggleLineNumbers: () => void;
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
          ? "border-accent bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200"
          : "border-transparent bg-transparent text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
      } ${disabled ? "pointer-events-none opacity-40" : ""}`}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <div className="mx-1 h-6 w-px shrink-0 bg-zinc-300 dark:bg-zinc-700" aria-hidden />;
}

const tableLayoutBtn =
  "inline-flex items-center justify-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50 active:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-900/80 dark:text-zinc-100 dark:hover:bg-zinc-800";

function preventMouseDown(e: React.MouseEvent) {
  e.preventDefault();
}

function textAlignValue(editor: Editor): string | null | undefined {
  if (editor.isActive("heading")) return editor.getAttributes("heading").textAlign;
  return editor.getAttributes("paragraph").textAlign;
}

export function FormattingToolbar({
  editor,
  layout,
  lineNumbers,
  onToggleLineNumbers,
  onOpenPageSetup,
}: Props) {
  useEditorRerender(editor);
  const imageFileRef = useRef<HTMLInputElement>(null);
  const [tableDialogOpen, setTableDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [mathDialogOpen, setMathDialogOpen] = useState(false);
  const [mathDialogInitial, setMathDialogInitial] = useState({
    latex: "",
    display: false,
    replaceSelection: false,
  });

  const ta = textAlignValue(editor);
  const inTable = editor.isActive("table");

  const p = editor.getAttributes("paragraph") as {
    indent?: number;
    lineHeight?: string | null;
    marginTop?: string | null;
    marginBottom?: string | null;
  };

  function openMathDialog() {
    const { from, to } = editor.state.selection;
    const selected = from !== to ? editor.state.doc.textBetween(from, to, "\n") : "";
    const parsed = parseMathSelection(selected);
    if (parsed) {
      setMathDialogInitial({
        latex: parsed.latex,
        display: parsed.display,
        replaceSelection: true,
      });
    } else if (selected.trim()) {
      setMathDialogInitial({
        latex: selected.trim(),
        display: false,
        replaceSelection: true,
      });
    } else {
      setMathDialogInitial({ latex: "", display: false, replaceSelection: false });
    }
    setMathDialogOpen(true);
  }

  function onPickImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const src = typeof reader.result === "string" ? reader.result : "";
      if (src) editor.chain().focus().setImage({ src }).run();
    };
    reader.readAsDataURL(file);
  }

  return (
    <div
      data-onboarding="formatting-toolbar"
      className="w-full shrink-0 border-b border-zinc-200 bg-white/95 px-2 py-1.5 backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/95"
    >
      <input
        ref={imageFileRef}
        type="file"
        accept="image/*"
        className="hidden"
        aria-hidden
        onChange={onPickImageFile}
      />
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

        <label className="inline-flex h-8 items-center gap-1 text-[11px] text-zinc-600 dark:text-zinc-400">
          <Type className="h-3 w-3 shrink-0" />
          <select
            className="formatting-toolbar-select max-w-[120px]"
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

        <label className="inline-flex h-8 items-center gap-1 text-[11px] text-zinc-600 dark:text-zinc-400">
          <select
            className="formatting-toolbar-select w-[4.5rem]"
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
          className="relative inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded border border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-950"
          title="Text color"
        >
          <Palette className="pointer-events-none h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
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
              className="h-5 w-5 rounded border border-zinc-300 dark:border-zinc-600"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editor.chain().focus().toggleHighlight({ color: c }).run()}
            />
          ))}
        </div>

        <label
          className="relative inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded border border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-950"
          title="Highlight color"
        >
          <Highlighter className="pointer-events-none h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
          <input
            type="color"
            className="absolute inset-0 cursor-pointer opacity-0"
            defaultValue="#fef08a"
            onChange={(e) => editor.chain().focus().toggleHighlight({ color: e.target.value }).run()}
          />
        </label>

        <label
          className="relative inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded border border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-950"
          title="Text background"
        >
          <PaintBucket className="pointer-events-none h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
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

        <label className="inline-flex h-8 items-center gap-1 text-[11px] text-zinc-600 dark:text-zinc-400">
          <Baseline className="h-3 w-3" />
          <select
            className="formatting-toolbar-select max-w-[5rem]"
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

        <label className="inline-flex h-8 items-center gap-1 text-[11px] text-zinc-600 dark:text-zinc-400">
          <span className="shrink-0">Space↑</span>
          <select
            className="formatting-toolbar-select max-w-[4.5rem]"
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

        <label className="inline-flex h-8 items-center gap-1 text-[11px] text-zinc-600 dark:text-zinc-400">
          <span className="shrink-0">Space↓</span>
          <select
            className="formatting-toolbar-select max-w-[4.5rem]"
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
          title="Increase indent (nest list level when inside a list)"
          onClick={() => {
            if (editor.can().sinkListItem("listItem")) {
              editor.chain().focus().sinkListItem("listItem").run();
            } else {
              editor
                .chain()
                .focus()
                .updateAttributes("paragraph", { indent: Math.min(8, (p.indent ?? 0) + 1) })
                .run();
            }
          }}
        >
          <IndentIncrease className="h-3.5 w-3.5" />
        </Btn>
        <Btn
          title="Decrease indent (outdent list when inside a list)"
          onClick={() => {
            if (editor.can().liftListItem("listItem")) {
              editor.chain().focus().liftListItem("listItem").run();
            } else {
              editor
                .chain()
                .focus()
                .updateAttributes("paragraph", { indent: Math.max(0, (p.indent ?? 0) - 1) })
                .run();
            }
          }}
        >
          <IndentDecrease className="h-3.5 w-3.5" />
        </Btn>

        <Sep />

        <Btn
          title="Bullet list (indent / outdent for sub-levels)"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-3.5 w-3.5" />
        </Btn>
        <Btn
          title="Numbered list (indent / outdent for sub-levels)"
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

        <label className="inline-flex h-8 items-center gap-1 text-[11px] text-zinc-600 dark:text-zinc-400">
          <Pilcrow className="h-3 w-3" />
          <select
            className="formatting-toolbar-select max-w-[7rem]"
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
          onClick={() => setLinkDialogOpen(true)}
        >
          <Link2 className="h-3.5 w-3.5" />
        </Btn>
        <Btn title="Insert equation — LaTeX (KaTeX); select existing $…$ to edit" onClick={openMathDialog}>
          <Sigma className="h-3.5 w-3.5" />
        </Btn>
        <Btn
          title="Insert image from file"
          onClick={() => imageFileRef.current?.click()}
        >
          <ImagePlus className="h-3.5 w-3.5" />
        </Btn>
        <Btn title="Insert table — choose rows & columns" onClick={() => setTableDialogOpen(true)}>
          <Table2 className="h-3.5 w-3.5" />
        </Btn>
        <Btn title="Horizontal line" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <Minus className="h-3.5 w-3.5" />
        </Btn>
        <Btn title="Page break" onClick={() => editor.chain().focus().setPageBreak().run()}>
          <BetweenHorizontalStart className="h-3.5 w-3.5" />
        </Btn>
        <Sep />
        <ManuscriptToolbar
          editor={editor}
          layout={layout}
          lineNumbers={lineNumbers}
          onToggleLineNumbers={onToggleLineNumbers}
        />
      </div>

      <TableInsertDialog
        open={tableDialogOpen}
        onClose={() => setTableDialogOpen(false)}
        onInsert={(rows, cols) => {
          editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
        }}
      />
      <LinkUrlDialog
        open={linkDialogOpen}
        onClose={() => setLinkDialogOpen(false)}
        initialUrl={(editor.getAttributes("link").href as string | undefined) ?? ""}
        onApply={(url) => {
          if (url === "") {
            editor.chain().focus().unsetLink().run();
            return;
          }
          editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
        }}
      />
      <MathEquationDialog
        open={mathDialogOpen}
        onClose={() => setMathDialogOpen(false)}
        initialLatex={mathDialogInitial.latex}
        initialDisplay={mathDialogInitial.display}
        replaceSelection={mathDialogInitial.replaceSelection}
        onInsert={(text, replaceSelection) => {
          const chain = editor.chain().focus();
          if (replaceSelection) chain.deleteSelection();
          chain.insertContent(text).run();
        }}
      />

      {inTable && (
        <div
          className="mt-2 rounded-lg border border-zinc-200 bg-zinc-50/90 px-3 py-2.5 dark:border-zinc-600 dark:bg-zinc-900/40"
          role="toolbar"
          aria-label="Table layout"
        >
          <div className="mb-2 flex items-center gap-2">
            <Table2 className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" aria-hidden />
            <span className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200">
              Table layout
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-start sm:gap-2">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                <Rows2 className="h-3 w-3" aria-hidden />
                Rows
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  title="Insert a row above the current row"
                  className={tableLayoutBtn}
                  onMouseDown={preventMouseDown}
                  onClick={() => editor.chain().focus().addRowBefore().run()}
                >
                  Insert above
                </button>
                <button
                  type="button"
                  title="Insert a row below the current row"
                  className={tableLayoutBtn}
                  onMouseDown={preventMouseDown}
                  onClick={() => editor.chain().focus().addRowAfter().run()}
                >
                  Insert below
                </button>
              </div>
            </div>
            <div
              className="hidden h-full min-h-[3rem] w-px shrink-0 self-stretch bg-zinc-200 dark:bg-zinc-600 sm:block"
              aria-hidden
            />
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                <Columns2 className="h-3 w-3" aria-hidden />
                Columns
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  title="Insert a column to the left"
                  className={tableLayoutBtn}
                  onMouseDown={preventMouseDown}
                  onClick={() => editor.chain().focus().addColumnBefore().run()}
                >
                  Insert left
                </button>
                <button
                  type="button"
                  title="Insert a column to the right"
                  className={tableLayoutBtn}
                  onMouseDown={preventMouseDown}
                  onClick={() => editor.chain().focus().addColumnAfter().run()}
                >
                  Insert right
                </button>
              </div>
            </div>
          </div>
          <div className="mt-3 border-t border-zinc-200 pt-2.5 dark:border-zinc-600">
            <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Delete
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                title="Delete the current row"
                className={tableLayoutBtn}
                onMouseDown={preventMouseDown}
                onClick={() => editor.chain().focus().deleteRow().run()}
              >
                Delete row
              </button>
              <button
                type="button"
                title="Delete the current column"
                className={tableLayoutBtn}
                onMouseDown={preventMouseDown}
                onClick={() => editor.chain().focus().deleteColumn().run()}
              >
                Delete column
              </button>
              <button
                type="button"
                title="Delete the entire table"
                className={`${tableLayoutBtn} border-red-200 text-red-800 hover:bg-red-50 dark:border-red-900/50 dark:text-red-300 dark:hover:bg-red-950/30`}
                onMouseDown={preventMouseDown}
                onClick={() => editor.chain().focus().deleteTable().run()}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                Delete table
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
