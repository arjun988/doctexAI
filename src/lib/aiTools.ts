export type AiToolId =
  | "fix-grammar"
  | "clean-formatting"
  | "math-equations"
  | "research-paper";

export const AI_TOOLS: Record<
  AiToolId,
  { slashes: string[]; label: string; instruction: string }
> = {
  "fix-grammar": {
    slashes: ["/fix-grammar", "/fix-grammer"],
    label: "Fix grammar",
    instruction: `## Tool: Fix grammar and spelling
- Correct grammar, spelling, and punctuation. Preserve meaning, terminology, and tone.
- Do not add commentary. Output **only** valid HTML for the edited scope.
- If the scope is the **current selection**, output only the HTML fragment that replaces that selection.
- If there is **no selection** (whole document), output the **full document body** as HTML.`,
  },
  "clean-formatting": {
    slashes: ["/clean-formatting"],
    label: "Clean formatting",
    instruction: `## Tool: Clean and structure formatting
- Organize content with clear **paragraphs** (\`<p>\`), **headings** (\`<h2>\`, \`<h3>\`) where it helps, **bullet or numbered lists** (\`<ul>\`/\`<ol>\`/\`<li>\`), and **bold** (\`<strong>\`) / *italic* (\`<em>\`) for emphasis where appropriate.
- Improve readability without changing factual meaning. Merge run-on text into sensible blocks.
- Output **only** valid HTML. Same scope rules: **selection** → replacement fragment only; **no selection** → full document body HTML.`,
  },
  "math-equations": {
    slashes: ["/math", "/math-equation", "/equations"],
    label: "Math equations",
    instruction: `## Tool: Mathematical notation (KaTeX LaTeX)
- The editor renders math from **plain text** delimiters: **inline** as \`$...$\` and **display (block)** as \`$$...$$\` (may span multiple lines inside the delimiters). Use **KaTeX-compatible LaTeX** only.
- Fix broken or unbalanced \`$\` / \`$$\`, unify notation, and ensure expressions compile. Do not replace valid math with images unless the user asked.
- Inline: one pair per expression; do not put line breaks inside \`$...$\`. Display: wrap multi-line or tall formulas in \`$$ ... $$\` (opening and closing on their own lines is fine).
- Output **only** valid HTML for the same scope as other tools: **selection** → HTML fragment that replaces the selection; **no selection** → full document body HTML. Preserve surrounding content; keep math as literal \`$\`/\`$$\` text inside the document text nodes (not HTML-escaped beyond normal HTML rules).`,
  },
  "research-paper": {
    slashes: ["/research-paper", "/research-format", "/ieee-paper", "/paper", "/research"],
    label: "Research paper",
    instruction: `## Tool: Research paper / journal manuscript (HTML styling)
Reformat the scope into a **conference/journal-style** document using **inline CSS** on elements the editor already supports (\`<p>\`, \`<h1>\`–\`<h3>\`, \`<strong>\`, \`<em>\`, \`<ul>\`/\`<ol>\`, \`<table>\`, \`<img>\`, \`<blockquote>\`). Preserve factual content and citations; improve structure only where needed.

### Page & margins (author should match in Page setup / export)
- Target **A4** (210×297 mm). **Margins: 1 in (2.54 cm)** top, bottom, left, right.
- Do not add conversational preamble; output **only** HTML. If the scope lacks a title block, add a sensible \`<h1>\`–\`<h2>\` hierarchy without inventing results.

### Columns
- **Default: single column.** If the user (or extra instructions) asks for **IEEE/ACM-style two columns**, wrap the main body in a single \`<div>\` with \`style="column-count:2; column-gap:0.25in; column-rule:none"\` (use ~0.2–0.25 in gap). Otherwise omit two-column wrapper.

### Font & sizes (Times New Roman stack)
- **Body:** \`font-family: 'Times New Roman', Times, serif; font-size: 12pt\`
- **Title** (document / paper title): \`font-size: 16pt\` (acceptable 14–18pt), \`font-weight: bold\`, optional \`text-align: center\`
- **Headings:** \`<h1>\` per title rules; \`<h2>\` **bold**, \`font-size: 13pt\`–\`14pt\`; \`<h3>\` **bold** or **bold italic** (\`<strong><em>\` or heading + inner spans), \`font-size: 12pt\`–\`13pt\`
- **Footnotes** (if present as small text): ~**10pt**
- **Figure captions** (below figure): **center**, **10–11pt** (e.g. \`10.5pt\`)
- **Table captions** (**above** table): **center**, **10–11pt**, often bold for label “Table N:”
- **References / bibliography** block: **10–12pt**, **hanging indent 0.5 in** per entry, e.g. \`style="font-size:11pt; margin:0 0 0.4em 0; padding-left:0.5in; text-indent:-0.5in"\` on each \`<p>\` or \`<li>\`

### Line spacing
- **Default:** \`line-height: 1.5\` on body paragraphs—or **double** if the user asks (\`line-height: 2\`).
- **IEEE-style:** if user requests IEEE/ACM compact layout, use **single** spacing (\`line-height: 1.15\` or \`1\`) for body.

### Paragraphs
- **Justified** text: \`text-align: justify\`
- **First-line indent:** \`text-indent: 0.5in\` on normal body \`<p>\` (not on headings, captions, references block if style conflicts—omit indent on centered captions and reference entries that already use hanging indent).
- **Spacing before/after:** \`margin-top: 0; margin-bottom: 0\` on paragraphs where appropriate; use a single \`margin-bottom\` between logical blocks sparingly if needed.

### Headings (semantics)
- **H1:** bold (title); **H2:** bold; **H3:** italic or bold italic as above.

### Abstract
- If an abstract exists or is implied, keep **one paragraph**, **150–250 words**, same font family, spacing per line-spacing rules above (\`1.5\` or IEEE single). Use a clear **“Abstract”** \`<h2>\` (or \`<h2><strong>Abstract</strong></h2>\`) before it.

### Figures & tables
- **Figure:** image then **caption below**, centered, 10–11pt.
- **Table:** **caption above** the \`<table>\`, centered, 10–11pt; keep \`<thead>\`/\`<th>\` where appropriate.

### Page numbers
- HTML body cannot paginate like Word; if the user asked for page numbers, add a **centered footer line** \`<p style="text-align:center; font-size:10pt">\` with placeholder text **“Page numbers: Add in final typesetting or header/footer in Word/PDF.”** Do not claim real page indices.

### Citation style
- If the user specifies **IEEE, APA, or MLA**, normalize reference list entries and in-text cues to that style **consistently**; otherwise keep existing citation style but tidy formatting.

### Math
- Keep equations as \`$...$\` / \`$$...$$\` (KaTeX) where they already exist.

### Output rules (same as other tools)
- Output **only** valid HTML for the scope: **selection** → fragment only; **no selection** → **full document body** HTML. No markdown fences, no commentary.`,
  },
};

/** Match a slash command; supports optional extra text after the command. */
export function parseSlashCommand(line: string): { tool: AiToolId; extra: string } | null {
  const t = line.trim();
  const lower = t.toLowerCase();
  for (const tool of Object.keys(AI_TOOLS) as AiToolId[]) {
    for (const slash of AI_TOOLS[tool].slashes) {
      const s = slash.toLowerCase();
      if (lower === s) return { tool, extra: "" };
      if (lower.startsWith(s + " ")) {
        return { tool, extra: t.slice(slash.length).trim() };
      }
    }
  }
  return null;
}

export function primarySlash(tool: AiToolId): string {
  return AI_TOOLS[tool].slashes[0];
}
