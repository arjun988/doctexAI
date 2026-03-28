export type AiToolId = "fix-grammar" | "clean-formatting";

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
