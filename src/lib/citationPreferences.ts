export type CitationStyle = "author-year" | "numbered";

export const CITATION_STYLE_KEY = "doctex-citation-style";

export function loadCitationStyle(): CitationStyle {
  if (typeof window === "undefined") return "author-year";
  try {
    const v = localStorage.getItem(CITATION_STYLE_KEY);
    return v === "numbered" ? "numbered" : "author-year";
  } catch {
    return "author-year";
  }
}

export function saveCitationStyle(style: CitationStyle) {
  try {
    localStorage.setItem(CITATION_STYLE_KEY, style);
  } catch {
    /* ignore */
  }
}

export function toggleCitationStyle(current: CitationStyle): CitationStyle {
  const next = current === "numbered" ? "author-year" : "numbered";
  saveCitationStyle(next);
  return next;
}
