/**
 * Normalize model output for TipTap: strip ``` fences, wrap plain text as HTML.
 */
export function normalizeAiOutput(raw: string): string {
  let s = raw.trim();
  const fence = /^```(?:html|xml)?\s*\n([\s\S]*?)\n```/m;
  const m = s.match(fence);
  if (m) {
    s = m[1].trim();
  } else if (s.startsWith("```")) {
    s = s.replace(/^```[^\n]*\n?/, "").replace(/\n?```$/, "").trim();
  }

  if (!s) return "<p></p>";

  if (/<[a-z][\s\S]*>/i.test(s)) {
    return s;
  }

  const escaped = s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const paras = escaped.split(/\n\n+/).filter(Boolean);
  if (paras.length === 0) return "<p></p>";
  return paras.map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`).join("");
}
