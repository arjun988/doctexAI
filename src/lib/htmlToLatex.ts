/**
 * Convert HTML (e.g. Mammoth .docx → HTML or TipTap HTML) into article LaTeX.
 * Honors {@link DocumentLayout} when provided (columns, margins, orientation, header/footer).
 */

import type { DocumentLayout } from "./documentLayout";

export type HtmlToLatexOptions = {
  title?: string;
  /** Page setup from DocTex (matches PDF/HTML export when exporting from the editor). */
  layout?: DocumentLayout;
};

function escapeLatex(s: string): string {
  return s
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/#/g, "\\#")
    .replace(/\$/g, "\\$")
    .replace(/%/g, "\\%")
    .replace(/&/g, "\\&")
    .replace(/_/g, "\\_")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}")
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}");
}

function trimEmpty(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function normalizeMathInner(s: string): string {
  return s
    .replace(/\u2212/g, "-")
    .replace(/\u00d7/g, "\\times ")
    .replace(/\u00f7/g, "\\div ")
    .replace(/\u00a0/g, " ")
    .replace(/\u2013|\u2014/g, "-")
    .trim();
}

/**
 * Parse `\( ... \)` and `\[ ... \]` (LaTeX-style) from pasted content, then `$` / `$$`.
 */
function textWithMathToLatex(text: string): string {
  let out = "";
  let i = 0;
  const len = text.length;

  function takePlain(end: number): void {
    if (end > i) {
      out += escapeLatex(text.slice(i, end));
    }
    i = end;
  }

  while (i < len) {
    if (text.startsWith("\\[", i)) {
      const end = text.indexOf("\\]", i + 2);
      if (end === -1) {
        takePlain(len);
        break;
      }
      const inner = normalizeMathInner(text.slice(i + 2, end));
      out += `\n\\[\n${inner}\n\\]\n`;
      i = end + 2;
      continue;
    }
    if (text.startsWith("\\(", i)) {
      const end = text.indexOf("\\)", i + 2);
      if (end === -1) {
        takePlain(i + 1);
        continue;
      }
      const inner = normalizeMathInner(text.slice(i + 2, end));
      out += `\\(${inner}\\)`;
      i = end + 2;
      continue;
    }
    if (text.startsWith("$$", i)) {
      const end = text.indexOf("$$", i + 2);
      if (end === -1) {
        out += escapeLatex(text.slice(i));
        break;
      }
      const inner = normalizeMathInner(text.slice(i + 2, end));
      out += `\n\\[\n${inner}\n\\]\n`;
      i = end + 2;
      continue;
    }
    if (text[i] === "$") {
      const end = text.indexOf("$", i + 1);
      if (end === -1 || text.slice(i + 1, end).includes("\n")) {
        out += escapeLatex(text[i]!);
        i += 1;
        continue;
      }
      const inner = normalizeMathInner(text.slice(i + 1, end));
      out += `\\(${inner}\\)`;
      i = end + 1;
      continue;
    }
    const nextSpecial = (() => {
      const positions = [
        text.indexOf("$", i),
        text.indexOf("\\[", i),
        text.indexOf("\\(", i),
      ].filter((p) => p >= 0);
      return positions.length ? Math.min(...positions) : -1;
    })();

    if (nextSpecial === -1) {
      out += escapeLatex(text.slice(i));
      break;
    }
    takePlain(nextSpecial);
  }
  return out;
}

function inlineChildren(node: Node): string {
  let out = "";
  for (const child of Array.from(node.childNodes)) {
    out += nodeToLatexInline(child);
  }
  return out.replace(/\s+/g, " ").trim();
}

function nodeToLatexInline(n: Node): string {
  if (n.nodeType === Node.TEXT_NODE) {
    return textWithMathToLatex(n.textContent ?? "");
  }
  if (n.nodeType !== Node.ELEMENT_NODE) return "";
  const el = n as Element;
  const tag = el.tagName.toLowerCase();

  switch (tag) {
    case "br":
      return "\\\\\n";
    case "strong":
    case "b":
      return `\\textbf{${inlineChildren(el)}}`;
    case "em":
    case "i":
      return `\\emph{${inlineChildren(el)}}`;
    case "u":
      return `\\underline{${inlineChildren(el)}}`;
    case "s":
    case "strike":
    case "del":
      return `\\sout{${inlineChildren(el)}}`;
    case "sub":
      return `\\textsubscript{${inlineChildren(el)}}`;
    case "sup":
      return `\\textsuperscript{${inlineChildren(el)}}`;
    case "code":
      return `\\texttt{${inlineChildren(el)}}`;
    case "span":
    case "font": {
      const dl =
        el.getAttribute("data-latex") ??
        el.getAttribute("data-math") ??
        el.getAttribute("data-equation");
      if (dl) {
        const normalized = normalizeMathInner(dl);
        const disp =
          el.getAttribute("data-display") === "true" ||
          el.classList.contains("equation") ||
          el.classList.contains("display-math");
        return disp ? `\n\\[\n${normalized}\n\\]\n` : `\\(${normalized}\\)`;
      }
      return inlineChildren(el);
    }
    case "a": {
      const href = el.getAttribute("href") ?? "";
      const label = inlineChildren(el);
      if (!href) return label;
      const hrefTex = href.replace(/([\\{}#%^$&_])/g, "\\$1");
      return `\\href{${hrefTex}}{${label || "\\texttt{" + escapeLatex(href) + "}"}}`;
    }
    case "img": {
      const src = el.getAttribute("src") ?? "";
      const alt = el.getAttribute("alt") ?? "";
      const title = el.getAttribute("title") ?? "";
      const texHint = /latex[:=]\s*(.+)/i.exec(alt)?.[1] ?? /latex[:=]\s*(.+)/i.exec(title)?.[1];
      if (texHint) {
        return `\\(${normalizeMathInner(texHint)}\\)`;
      }
      if (src.startsWith("data:")) {
        return `% [Image / equation graphic — add \\includegraphics or rewrite as math]{${escapeLatex(alt || "fig")}}`;
      }
      return `% \\includegraphics[width=\\linewidth]{${escapeLatex(src.split("/").pop() ?? "figure")}}\n% Source: \\texttt{${escapeLatex(src)}}`;
    }
    default:
      return inlineChildren(el);
  }
}

function listToLatex(
  el: Element,
  ordered: boolean
): string {
  const env = ordered ? "enumerate" : "itemize";
  const items = Array.from(el.querySelectorAll(":scope > li"));
  const body = items
    .map((li) => {
      const inner = blockifyLi(li);
      return `  \\item ${inner}\n`;
    })
    .join("");
  return `\\begin{${env}}\n${body}\\end{${env}}\n\n`;
}

function blockifyLi(li: Element): string {
  const kids = Array.from(li.childNodes);
  const hasBlocks = kids.some(
    (k) =>
      k.nodeType === Node.ELEMENT_NODE &&
      ["p", "div", "ul", "ol", "table"].includes((k as Element).tagName.toLowerCase())
  );
  if (!hasBlocks) {
    return inlineChildren(li);
  }
  const parts: string[] = [];
  for (const k of kids) {
    parts.push(nodeToLatexBlock(k, { inListItem: true }).trim());
  }
  return parts.filter(Boolean).join("\n\n");
}

function tableToLatex(table: HTMLTableElement): string {
  const rows = Array.from(table.querySelectorAll("tr"));
  if (rows.length === 0) return "";
  const colCounts = rows.map((r) => r.querySelectorAll("th, td").length);
  const numCols = Math.max(1, ...colCounts);
  const spec = "|" + Array(numCols).fill("l").join("|") + "|";
  let out = `\\begin{tabular}{${spec}}\n\\hline\n`;
  for (const tr of rows) {
    const cells = Array.from(tr.querySelectorAll("th, td")).map((cell) => {
      const t = inlineChildren(cell);
      return t || "~";
    });
    while (cells.length < numCols) cells.push("~");
    out += cells.join(" & ") + " \\\\\n\\hline\n";
  }
  out += "\\end{tabular}\n\n";
  return out;
}

type BlockOpts = { inListItem?: boolean };

function nodeToLatexBlock(n: Node, opts: BlockOpts = {}): string {
  if (n.nodeType === Node.TEXT_NODE) {
    const t = (n.textContent ?? "").trim();
    if (!t) return "";
    return textWithMathToLatex(t) + (opts.inListItem ? "" : "\n\n");
  }
  if (n.nodeType !== Node.ELEMENT_NODE) return "";
  const el = n as Element;
  const tag = el.tagName.toLowerCase();

  switch (tag) {
    case "p": {
      const inner = inlineChildren(el);
      return inner ? `${inner}\n\n` : "";
    }
    case "h1":
      return `\\section{${inlineChildren(el)}}\n\n`;
    case "h2":
      return `\\subsection{${inlineChildren(el)}}\n\n`;
    case "h3":
      return `\\subsubsection{${inlineChildren(el)}}\n\n`;
    case "h4":
      return `\\paragraph{${inlineChildren(el)}}\n\n`;
    case "h5":
    case "h6":
      return `\\subparagraph{${inlineChildren(el)}}\n\n`;
    case "ul": {
      const isTask = el.getAttribute("data-type") === "taskList";
      if (isTask) {
        return `% Task list (simplified as itemize)\n${listToLatex(el, false)}`;
      }
      return listToLatex(el, false);
    }
    case "ol":
      return listToLatex(el, true);
    case "blockquote":
      return `\\begin{quote}\n${trimEmpty(
        Array.from(el.childNodes)
          .map((c) => nodeToLatexBlock(c))
          .join("\n")
      )}\n\\end{quote}\n\n`;
    case "pre":
      return `\\begin{verbatim}\n${el.textContent ?? ""}\\end{verbatim}\n\n`;
    case "hr":
      return "\\noindent\\rule{\\linewidth}{0.4pt}\n\n";
    case "table":
      return tableToLatex(el as HTMLTableElement);
    case "div":
      if (isPageBreakElement(el)) {
        return "\\newpage\n\n";
      }
    // fallthrough
    case "section":
    case "article":
    case "main":
      return Array.from(el.childNodes)
        .map((c) => nodeToLatexBlock(c, opts))
        .join("");
    case "img": {
      const src = el.getAttribute("src") ?? "";
      return `% Figure: ${escapeLatex(src)}\n\n`;
    }
    default:
      if (opts.inListItem && tag === "ul") {
        return listToLatex(el, false);
      }
      if (opts.inListItem && tag === "ol") {
        return listToLatex(el, true);
      }
      if (el.childNodes.length > 0) {
        const nested = Array.from(el.childNodes)
          .map((c) => nodeToLatexBlock(c, opts))
          .join("");
        if (nested.trim()) return nested;
      }
      const inline = inlineChildren(el);
      return inline ? `${inline}\n\n` : "";
  }
}

function isPageBreakElement(el: Element): boolean {
  if (el.getAttribute("data-type") === "page-break") return true;
  if (el.classList.contains("doc-page-break")) return true;
  return false;
}

/** Body fragment only (no \\documentclass). */
export function htmlToLatexBody(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const body = doc.body;
  if (!body) return "";
  const parts = Array.from(body.childNodes).map((c) => nodeToLatexBlock(c));
  return parts.join("").trim() + "\n";
}

function buildGeometryLine(layout: DocumentLayout): string {
  const opt = [
    layout.orientation === "landscape" ? "landscape" : "",
    "a4paper",
    `top=${layout.marginTop}`,
    `bottom=${layout.marginBottom}`,
    `left=${layout.marginLeft}`,
    `right=${layout.marginRight}`,
  ]
    .filter(Boolean)
    .join(",");
  return `\\usepackage[${opt}]{geometry}`;
}

function fancyHeaderFooterBlock(layout: DocumentLayout): string {
  const h = layout.headerText.trim();
  const f = layout.footerText.trim();
  if (!h && !f) return "";
  const lineBreak = (s: string) => escapeLatex(s).replace(/\r\n|\r|\n/g, " \\\\ ");
  return `\\usepackage{fancyhdr}
\\pagestyle{fancy}
\\fancyhf{}
${h ? `\\fancyhead[C]{${lineBreak(h)}}\n` : "\\fancyhead{}\n"}${f ? `\\fancyfoot[C]{${lineBreak(f)}}\n` : "\\fancyfoot{}\n"}\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}
`;
}

function wrapBodyWithColumns(body: string, layout: DocumentLayout | undefined): string {
  const b = body.trim();
  if (!layout || layout.columns <= 1) return b;
  return `\\begin{multicols}{${layout.columns}}
${b}
\\end{multicols}
`;
}

export function wrapLatexDocument(
  body: string,
  title = "Converted document",
  layout?: DocumentLayout
): string {
  const safeTitle = escapeLatex(title);
  const geom = layout ? buildGeometryLine(layout) : "\\usepackage[a4paper,margin=22mm]{geometry}";
  const fancy = layout ? fancyHeaderFooterBlock(layout) : "";
  const multicol = layout && layout.columns > 1 ? "\\usepackage{multicol}\n" : "";
  const columnSep =
    layout && layout.columns > 1 ? "\\setlength{\\columnsep}{1.25em}\n" : "";
  const innerBody = wrapBodyWithColumns(body, layout);

  return `\\documentclass[11pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{lmodern}
\\usepackage{microtype}
${geom}
${multicol}${columnSep}${fancy}\\usepackage{amsmath}
\\usepackage{graphicx}
\\usepackage[hidelinks]{hyperref}
\\usepackage{booktabs}
\\usepackage{array}
\\usepackage[normalem]{ulem}

\\title{${safeTitle}}
\\author{}
\\date{}

\\begin{document}
\\maketitle

${innerBody.trim()}

\\end{document}
`;
}

/** Full .tex file from HTML. */
export function htmlToLatexDocument(html: string, options?: HtmlToLatexOptions): string {
  const body = htmlToLatexBody(html);
  return wrapLatexDocument(
    body,
    options?.title ?? "Converted document",
    options?.layout
  );
}
