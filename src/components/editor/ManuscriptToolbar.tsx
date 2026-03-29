"use client";

import type { Editor } from "@tiptap/core";
import { useEffect, useReducer, useState } from "react";
import { CitationInsertDialog } from "@/components/editor/EditorDialogs";
import type { DocumentLayout } from "@/lib/documentLayout";
import {
  loadCitationStyle,
  saveCitationStyle,
  type CitationStyle,
} from "@/lib/citationPreferences";
import {
  collectCitationsInDocOrder,
  countWordsAndChars,
  estimatePrintedPages,
  insertBibliographySection,
  insertEndnotePair,
  insertFootnotePair,
  jumpNoteOrRef,
  newCiteKey,
  refreshBibliographySection,
} from "@/lib/manuscriptHelpers";
import {
  ArrowDownUp,
  BookMarked,
  Braces,
  CaseSensitive,
  ClipboardList,
  Hash,
  Library,
  ListTree,
  PanelTop,
  Quote,
  RefreshCw,
  StickyNote,
  Type,
} from "lucide-react";

function useEditorRerender(editor: Editor) {
  const [, tick] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    const fn = () => tick();
    editor.on("selectionUpdate", fn);
    editor.on("transaction", fn);
    return () => {
      editor.off("selectionUpdate", fn);
      editor.off("transaction", fn);
    };
  }, [editor]);
}

type Props = {
  editor: Editor;
  layout: DocumentLayout;
  lineNumbers: boolean;
  onToggleLineNumbers: () => void;
};

function MBtn({
  title,
  onClick,
  active,
  disabled,
  children,
}: {
  title: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
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

export function ManuscriptToolbar({ editor, layout, lineNumbers, onToggleLineNumbers }: Props) {
  useEditorRerender(editor);
  const [citationStyle, setCitationStyle] = useState<CitationStyle>(() => loadCitationStyle());
  const [citeOpen, setCiteOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);

  const fullText = editor.state.doc.textContent;
  const { from, to } = editor.state.selection;
  const selText =
    from !== to ? editor.state.doc.textBetween(from, to, " ") : "";
  const docStats = countWordsAndChars(fullText);
  const selStats = selText ? countWordsAndChars(selText) : null;
  const pages = estimatePrintedPages(fullText.length, layout.columns);
  const nCites = collectCitationsInDocOrder(editor.state.doc).length;
  const nextNum = nCites + 1;

  function toggleStyle() {
    const next = citationStyle === "numbered" ? "author-year" : "numbered";
    saveCitationStyle(next);
    setCitationStyle(next);
  }

  function applyCitation(display: string, placeholderOnly: boolean) {
    const citeKey = newCiteKey();
    const text = placeholderOnly
      ? citationStyle === "numbered"
        ? "[?]"
        : "(Citation?)"
      : display || (citationStyle === "numbered" ? "[?]" : "(Citation?)");
    editor
      .chain()
      .focus()
      .insertContent({
        type: "text",
        text,
        marks: [{ type: "citation", attrs: { citeKey } }],
      })
      .run();
  }

  const citeDialogInitial =
    citationStyle === "numbered" ? `[${nextNum}]` : "(Author, Year)";

  return (
    <>
      <MBtn title="Insert footnote (reference + note at document end)" onClick={() => insertFootnotePair(editor)}>
        <StickyNote className="h-3.5 w-3.5" />
      </MBtn>
      <MBtn title="Insert endnote (reference + note under Endnotes)" onClick={() => insertEndnotePair(editor)}>
        <BookMarked className="h-3.5 w-3.5" />
      </MBtn>
      <MBtn
        title="Jump between note marker and note text (place caret in superscript or in the note)"
        onClick={() => jumpNoteOrRef(editor)}
      >
        <ArrowDownUp className="h-3.5 w-3.5" />
      </MBtn>
      <MBtn title="Insert citation…" onClick={() => setCiteOpen(true)}>
        <Quote className="h-3.5 w-3.5" />
      </MBtn>
      <MBtn
        title="Insert References heading and bibliography block"
        onClick={() => insertBibliographySection(editor, citationStyle)}
      >
        <Library className="h-3.5 w-3.5" />
      </MBtn>
      <MBtn
        title="Refresh bibliography from in-text citations (creates References if needed)"
        onClick={() => {
          const r = refreshBibliographySection(editor, citationStyle);
          if (!r.ok) {
            insertBibliographySection(editor, citationStyle);
            refreshBibliographySection(editor, citationStyle);
          }
        }}
      >
        <RefreshCw className="h-3.5 w-3.5" />
      </MBtn>
      <MBtn
        title={`Citation mode: ${
          citationStyle === "numbered" ? "numbered [n]" : "author–year (…)"
        } — click to switch`}
        onClick={toggleStyle}
      >
        {citationStyle === "numbered" ? (
          <Hash className="h-3.5 w-3.5" />
        ) : (
          <Braces className="h-3.5 w-3.5" />
        )}
      </MBtn>
      <MBtn
        title="Abbreviation — first use (term + expansion)"
        onClick={() =>
          editor
            .chain()
            .focus()
            .insertContent(
              "<p>First use: <strong>TLA</strong> (<em>three-letter acronym</em>) …</p>"
            )
            .run()
        }
      >
        <CaseSensitive className="h-3.5 w-3.5" />
      </MBtn>
      <MBtn
        title="Abbreviation — subsequent use (acronym only)"
        onClick={() =>
          editor.chain().focus().insertContent("<p>Subsequent use: TLA …</p>").run()
        }
      >
        <Type className="h-3.5 w-3.5" />
      </MBtn>
      <MBtn
        title="Insert title / author / affiliation / ORCID / keywords block"
        onClick={() =>
          editor
            .chain()
            .focus()
            .insertContent(
              `<p style="font-size:12pt;font-weight:700;text-align:center">Paper title</p>` +
                `<p style="font-size:11pt;text-align:center">Author One<sup>1</sup>, Author Two<sup>2</sup></p>` +
                `<p style="font-size:9pt;text-align:center;color:#52525b"><sup>1</sup>Affiliation, City. ORCID: 0000-0000-0000-0000</p>` +
                `<p style="font-size:9pt;text-align:center;color:#52525b"><sup>2</sup>Affiliation, City.</p>` +
                `<p style="font-size:10pt;margin-top:1em"><strong>Keywords:</strong> keyword one; keyword two</p>`
            )
            .run()
        }
      >
        <ClipboardList className="h-3.5 w-3.5" />
      </MBtn>
      <MBtn
        title="Insert running head (journal-style short title, uppercase)"
        onClick={() =>
          editor
            .chain()
            .focus()
            .insertContent(
              '<p style="font-size:9pt;letter-spacing:0.04em;text-transform:uppercase;line-height:1.2;margin-top:0;margin-bottom:0.5em">Running head: SHORT TITLE</p>'
            )
            .run()
        }
      >
        <PanelTop className="h-3.5 w-3.5" />
      </MBtn>
      <MBtn
        title="Block line numbers (manuscript-style gutter; counts blocks, not wrapped text lines)"
        active={lineNumbers}
        onClick={onToggleLineNumbers}
      >
        <ListTree className="h-3.5 w-3.5" />
      </MBtn>
      <div className="relative shrink-0">
        <MBtn
          title="Word & character count; approximate pages"
          onClick={() => setStatsOpen((s) => !s)}
        >
          <span className="text-[10px] font-semibold tabular-nums">
            {docStats.words}w · ~{pages}p
          </span>
        </MBtn>
        {statsOpen ? (
          <div
            className="absolute right-0 top-full z-[80] mt-1 w-60 rounded-lg border border-zinc-200 bg-white p-3 text-[11px] shadow-xl dark:border-zinc-600 dark:bg-zinc-900"
            role="status"
          >
            <div className="mb-1 font-semibold text-zinc-800 dark:text-zinc-100">Document</div>
            <div className="space-y-0.5 text-zinc-600 dark:text-zinc-300">
              <div>Words: {docStats.words}</div>
              <div>Characters (with spaces): {docStats.charsWithSpaces}</div>
              <div>Characters (no spaces): {docStats.charsNoSpaces}</div>
              <div>Est. printed pages: ~{pages} ({layout.columns} col.)</div>
            </div>
            {selStats ? (
              <>
                <div className="mb-1 mt-2 font-semibold text-zinc-800 dark:text-zinc-100">Selection</div>
                <div className="space-y-0.5 text-zinc-600 dark:text-zinc-300">
                  <div>Words: {selStats.words}</div>
                  <div>Characters (with spaces): {selStats.charsWithSpaces}</div>
                  <div>Characters (no spaces): {selStats.charsNoSpaces}</div>
                </div>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      <CitationInsertDialog
        open={citeOpen}
        onClose={() => setCiteOpen(false)}
        initialDisplay={citeDialogInitial}
        onInsert={applyCitation}
      />
    </>
  );
}
