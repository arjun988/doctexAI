/** Parse editor selection that is already wrapped in $...$ or $$...$$ */
export function parseMathSelection(text: string): { latex: string; display: boolean } | null {
  const t = text.trim();
  if (!t) return null;
  const block = /^\$\$\s*([\s\S]*?)\s*\$\$/;
  const bm = block.exec(t);
  if (bm) return { latex: bm[1].trim(), display: true };
  const inline = /^\$([^$\n]+)\$/;
  const im = inline.exec(t);
  if (im) return { latex: im[1].trim(), display: false };
  return null;
}

export function formatMathForEditor(latex: string, display: boolean): string {
  const t = latex.trim();
  if (!t) return "";
  return display ? `$$\n${t}\n$$` : `$${t}$`;
}
