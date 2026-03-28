export const DOC_LAYOUT_KEY = "doctex-document-layout";

export type DocumentLayout = {
  columns: 1 | 2 | 3;
  orientation: "portrait" | "landscape";
  marginTop: string;
  marginBottom: string;
  marginLeft: string;
  marginRight: string;
  headerText: string;
  footerText: string;
};

export const defaultDocumentLayout: DocumentLayout = {
  columns: 1,
  orientation: "portrait",
  marginTop: "18mm",
  marginBottom: "18mm",
  marginLeft: "22mm",
  marginRight: "22mm",
  headerText: "",
  footerText: "",
};

export function loadDocumentLayout(): DocumentLayout {
  if (typeof window === "undefined") return { ...defaultDocumentLayout };
  try {
    const raw = localStorage.getItem(DOC_LAYOUT_KEY);
    if (!raw) return { ...defaultDocumentLayout };
    const p = JSON.parse(raw) as Partial<DocumentLayout>;
    return {
      columns: p.columns === 2 || p.columns === 3 ? p.columns : 1,
      orientation: p.orientation === "landscape" ? "landscape" : "portrait",
      marginTop: typeof p.marginTop === "string" ? p.marginTop : defaultDocumentLayout.marginTop,
      marginBottom:
        typeof p.marginBottom === "string" ? p.marginBottom : defaultDocumentLayout.marginBottom,
      marginLeft:
        typeof p.marginLeft === "string" ? p.marginLeft : defaultDocumentLayout.marginLeft,
      marginRight:
        typeof p.marginRight === "string" ? p.marginRight : defaultDocumentLayout.marginRight,
      headerText: typeof p.headerText === "string" ? p.headerText : "",
      footerText: typeof p.footerText === "string" ? p.footerText : "",
    };
  } catch {
    return { ...defaultDocumentLayout };
  }
}

export function saveDocumentLayout(patch: Partial<DocumentLayout>): DocumentLayout {
  const next = { ...loadDocumentLayout(), ...patch };
  localStorage.setItem(DOC_LAYOUT_KEY, JSON.stringify(next));
  return next;
}

export const MARGIN_PRESETS = {
  narrow: { marginTop: "12mm", marginBottom: "12mm", marginLeft: "15mm", marginRight: "15mm" },
  normal: { marginTop: "18mm", marginBottom: "18mm", marginLeft: "22mm", marginRight: "22mm" },
  wide: { marginTop: "25mm", marginBottom: "25mm", marginLeft: "30mm", marginRight: "30mm" },
} as const;
