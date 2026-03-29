import type { Editor } from "@tiptap/core";
import type { Mark, Node as PMNode } from "@tiptap/pm/model";
import type { CitationStyle } from "@/lib/citationPreferences";

export const LINE_NUMBERS_KEY = "doctex-line-numbers";

export function loadLineNumbersPref(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(LINE_NUMBERS_KEY) === "1";
  } catch {
    return false;
  }
}

export function saveLineNumbersPref(on: boolean) {
  try {
    localStorage.setItem(LINE_NUMBERS_KEY, on ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export type CiteItem = { citeKey: string; display: string };

export function newCiteKey(): string {
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function collectCitationsInDocOrder(doc: PMNode): CiteItem[] {
  const ordered: CiteItem[] = [];
  const seen = new Set<string>();
  doc.descendants((node) => {
    if (!node.isText) return;
    const mark = node.marks.find((m) => m.type.name === "citation");
    if (!mark) return;
    const citeKey = mark.attrs.citeKey as string;
    if (!citeKey || seen.has(citeKey)) return;
    seen.add(citeKey);
    ordered.push({ citeKey, display: node.text ?? "" });
  });
  return ordered;
}

function isRefsHeading(node: PMNode): boolean {
  if (node.type.name !== "heading") return false;
  if (node.attrs.level !== 2) return false;
  const t = node.textContent.trim().toLowerCase();
  return t === "references" || t === "bibliography";
}

export function findReferencesBodyRange(doc: PMNode): { from: number; to: number } | null {
  let refHeadingEnd: number | null = null;
  let refHeadingPos = -1;
  doc.descendants((node, pos) => {
    if (!node.isBlock) return;
    if (refHeadingEnd != null) return;
    if (isRefsHeading(node)) {
      refHeadingEnd = pos + node.nodeSize;
      refHeadingPos = pos;
    }
  });
  if (refHeadingEnd == null) return null;
  let end = doc.content.size;
  doc.descendants((node, pos) => {
    if (!node.isBlock) return;
    if (node.type.name === "heading" && (node.attrs.level as number) <= 2 && pos > refHeadingPos) {
      end = Math.min(end, pos);
    }
  });
  return { from: refHeadingEnd, to: end };
}

function escapeAttr(s: string) {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function escapeText(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const BIB_P =
  "font-size:11pt;margin:0 0 0.4em 0;padding-left:0.5in;text-indent:-0.5in";

function bibLineForItem(it: CiteItem, index: number, style: CitationStyle): string {
  if (style === "numbered") {
    return `${index + 1}. ${it.display}. Author, A. A. (Year). Full reference for key ${it.citeKey}.`;
  }
  const label = it.display.replace(/^\(|\)$/g, "").trim() || it.citeKey;
  return `${label}. Author, A. A. (Year). Title. Journal, Volume(Issue), pages. (source: ${it.citeKey})`;
}

export function buildBibliographyHtmlFragment(items: CiteItem[], style: CitationStyle): string {
  if (items.length === 0) {
    return `<p style="${BIB_P}" data-bib-placeholder="true"><em>Add in-text citations, then use Refresh bibliography.</em></p>`;
  }
  return items
    .map((it, i) => {
      const line = escapeText(bibLineForItem(it, i, style));
      return `<p style="${BIB_P}" data-bib-key="${escapeAttr(it.citeKey)}">${line}</p>`;
    })
    .join("");
}

export function renumberCitationsInText(editor: Editor, orderedKeys: string[]) {
  const keyToIndex = new Map(orderedKeys.map((k, i) => [k, i + 1]));
  const { state } = editor;
  const { tr, doc, schema } = state;

  const replacements: { from: number; to: number; text: string; marks: readonly Mark[] }[] = [];
  doc.descendants((node, pos) => {
    if (!node.isText) return;
    const cMark = node.marks.find((m) => m.type.name === "citation");
    if (!cMark) return;
    const key = cMark.attrs.citeKey as string;
    const n = keyToIndex.get(key);
    if (n == null) return;
    const next = `[${n}]`;
    const cur = node.text ?? "";
    if (cur !== next)
      replacements.push({ from: pos, to: pos + cur.length, text: next, marks: node.marks });
  });

  if (replacements.length === 0) return;

  replacements.sort((a, b) => b.from - a.from);
  let tx = tr;
  for (const r of replacements) {
    tx = tx.replaceWith(r.from, r.to, schema.text(r.text, r.marks));
  }
  editor.view.dispatch(tx);
}

export function insertBibliographySection(editor: Editor, style: CitationStyle) {
  const frag = buildBibliographyHtmlFragment(
    collectCitationsInDocOrder(editor.state.doc),
    style
  );
  editor.chain().focus().insertContent(`<h2>References</h2>${frag}`).run();
}

export function refreshBibliographySection(editor: Editor, style: CitationStyle) {
  const items = collectCitationsInDocOrder(editor.state.doc);
  const range = findReferencesBodyRange(editor.state.doc);
  if (!range) return { ok: false as const, reason: "no references" as const };

  if (style === "numbered" && items.length > 0) {
    renumberCitationsInText(editor, items.map((i) => i.citeKey));
  }

  const doc = editor.state.doc;
  const range2 = findReferencesBodyRange(doc);
  if (!range2) return { ok: false as const, reason: "no references" as const };

  const html = buildBibliographyHtmlFragment(
    style === "numbered" ? collectCitationsInDocOrder(editor.state.doc) : items,
    style
  );
  editor
    .chain()
    .focus()
    .deleteRange({ from: range2.from, to: range2.to })
    .insertContentAt(range2.from, html)
    .run();

  return { ok: true as const };
}

function maxNoteIndex(doc: PMNode, prefix: "fn" | "en"): number {
  let max = 0;
  const re = prefix === "fn" ? /^fn-(\d+)$/ : /^en-(\d+)$/;

  doc.descendants((node) => {
    if (node.type.name !== "paragraph") return;
    const attrs = node.attrs as { footnoteAnchor?: string | null; endnoteAnchor?: string | null };
    const a = prefix === "fn" ? attrs.footnoteAnchor : attrs.endnoteAnchor;
    if (!a) return;
    const m = a.match(re);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });

  doc.descendants((node) => {
    if (!node.isText) return;
    const link = node.marks.find((m) => m.type.name === "link");
    if (!link) return;
    const href = link.attrs.href as string;
    if (typeof href !== "string" || !href.startsWith("#")) return;
    const id = href.slice(1);
    const m = id.match(re);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });

  return max;
}

export function insertFootnotePair(editor: Editor) {
  const n = maxNoteIndex(editor.state.doc, "fn") + 1;
  const id = `fn-${n}`;
  const href = `#${id}`;
  editor
    .chain()
    .focus()
    .insertContent([
      {
        type: "text",
        text: String(n),
        marks: [
          { type: "link", attrs: { href } },
          { type: "superscript" },
        ],
      },
      { type: "text", text: " " },
    ])
    .run();

  editor
    .chain()
    .focus("end")
    .insertContent({
      type: "paragraph",
      attrs: { footnoteAnchor: id },
      content: [{ type: "text", text: `${n}. ` }],
    })
    .run();
}

function hasEndnotesHeading(doc: PMNode): boolean {
  let found = false;
  doc.descendants((node) => {
    if (node.type.name === "heading" && node.attrs.level === 2) {
      if (node.textContent.trim().toLowerCase() === "endnotes") found = true;
    }
  });
  return found;
}

export function insertEndnotePair(editor: Editor) {
  const n = maxNoteIndex(editor.state.doc, "en") + 1;
  const id = `en-${n}`;
  const href = `#${id}`;
  editor
    .chain()
    .focus()
    .insertContent([
      {
        type: "text",
        text: String(n),
        marks: [
          { type: "link", attrs: { href } },
          { type: "superscript" },
        ],
      },
      { type: "text", text: " " },
    ])
    .run();

  const needHeading = !hasEndnotesHeading(editor.state.doc);
  if (needHeading) {
    editor
      .chain()
      .focus("end")
      .insertContent([
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Endnotes" }] },
        {
          type: "paragraph",
          attrs: { endnoteAnchor: id },
          content: [{ type: "text", text: `${n}. ` }],
        },
      ])
      .run();
  } else {
    editor
      .chain()
      .focus("end")
      .insertContent({
        type: "paragraph",
        attrs: { endnoteAnchor: id },
        content: [{ type: "text", text: `${n}. ` }],
      })
      .run();
  }
}

export function findNoteBodyPos(doc: PMNode, anchorId: string): number | null {
  let found: number | null = null;
  doc.descendants((node, pos) => {
    if (found != null) return false;
    if (node.type.name !== "paragraph") return;
    const attrs = node.attrs as { footnoteAnchor?: string | null; endnoteAnchor?: string | null };
    if (attrs.footnoteAnchor === anchorId || attrs.endnoteAnchor === anchorId) {
      found = pos + 1;
    }
  });
  return found;
}

export function findFirstRefPosForAnchor(doc: PMNode, anchorId: string): number | null {
  const href = `#${anchorId}`;
  let found: number | null = null;
  doc.descendants((node, pos) => {
    if (found != null) return false;
    if (!node.isText) return;
    const link = node.marks.find((m) => m.type.name === "link" && m.attrs.href === href);
    if (link) found = pos;
  });
  return found;
}

export function anchorAtSelection(editor: Editor): string | null {
  const { $from } = editor.state.selection;
  for (let d = $from.depth; d > 0; d--) {
    const node = $from.node(d);
    if (node.type.name !== "paragraph") continue;
    const attrs = node.attrs as { footnoteAnchor?: string | null; endnoteAnchor?: string | null };
    if (attrs.footnoteAnchor) return attrs.footnoteAnchor;
    if (attrs.endnoteAnchor) return attrs.endnoteAnchor;
  }

  const marks = $from.marks();
  const link = marks.find((m) => m.type.name === "link");
  const href = link?.attrs.href as string | undefined;
  if (href?.startsWith("#fn-") || href?.startsWith("#en-")) return href.slice(1);
  return null;
}

function $fromInNoteBody(editor: Editor): boolean {
  const { $from } = editor.state.selection;
  for (let d = $from.depth; d > 0; d--) {
    const node = $from.node(d);
    if (node.type.name !== "paragraph") continue;
    const attrs = node.attrs as { footnoteAnchor?: string | null; endnoteAnchor?: string | null };
    if (attrs.footnoteAnchor || attrs.endnoteAnchor) return true;
  }
  return false;
}

export function jumpNoteOrRef(editor: Editor) {
  const id = anchorAtSelection(editor);
  if (!id) return;
  const doc = editor.state.doc;
  const inBody = $fromInNoteBody(editor);

  if (inBody) {
    const ref = findFirstRefPosForAnchor(doc, id);
    if (ref != null) editor.chain().focus().setTextSelection(ref).scrollIntoView().run();
    return;
  }

  const body = findNoteBodyPos(doc, id);
  if (body != null) editor.chain().focus().setTextSelection(body).scrollIntoView().run();
}

export function countWordsAndChars(text: string) {
  const trimmed = text.trim();
  const words = trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;
  const charsWithSpaces = text.length;
  const charsNoSpaces = text.replace(/\s/g, "").length;
  return { words, charsWithSpaces, charsNoSpaces };
}

/** ~US Letter / A4-ish heuristic for 11pt single column */
export function estimatePrintedPages(textLength: number, columns: number): number {
  const effectiveCols = Math.max(1, columns);
  const charsPerPage = Math.round(2900 / effectiveCols);
  return Math.max(1, Math.ceil(textLength / charsPerPage));
}
