export const FONT_FAMILIES = [
  "Arial",
  "Times New Roman",
  "Georgia",
  "Calibri",
  "Verdana",
  "Courier New",
  "Helvetica",
  "Trebuchet MS",
  "Garamond",
  "Palatino Linotype",
  "Segoe UI",
  "Comic Sans MS",
] as const;

export const FONT_SIZES = [
  "8px",
  "9px",
  "10px",
  "11px",
  "12px",
  "14px",
  "16px",
  "18px",
  "20px",
  "24px",
  "28px",
  "36px",
  "48px",
  "72px",
] as const;

export const LINE_HEIGHTS: { label: string; value: string }[] = [
  { label: "1", value: "1" },
  { label: "1.15", value: "1.15" },
  { label: "1.5", value: "1.5" },
  { label: "2", value: "2" },
  { label: "2.5", value: "2.5" },
];

export const PARA_SPACING: { label: string; value: string }[] = [
  { label: "0", value: "0pt" },
  { label: "6 pt", value: "6pt" },
  { label: "12 pt", value: "12pt" },
  { label: "18 pt", value: "18pt" },
  { label: "24 pt", value: "24pt" },
];

export const HIGHLIGHT_PRESETS = [
  "#fef08a",
  "#bbf7d0",
  "#bfdbfe",
  "#fbcfe8",
  "#e9d5ff",
  "#fed7aa",
];
