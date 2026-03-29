export const EDITOR_ONBOARDING_STORAGE_KEY = "doctex-editor-onboarding-v1";

export type EditorOnboardingStep =
  | {
      id: string;
      title: string;
      body: string;
      center: true;
    }
  | {
      id: string;
      title: string;
      body: string;
      target: "app-toolbar" | "formatting-toolbar" | "editor-canvas" | "ai-panel";
    };

export const EDITOR_ONBOARDING_STEPS: EditorOnboardingStep[] = [
  {
    id: "welcome",
    title: "Welcome to DocTex",
    body: "Quick tour: the top bar, formatting tools, your document page, and the AI assistant. Use Next to continue or Skip anytime.",
    center: true,
  },
  {
    id: "app-toolbar",
    title: "Document toolbar",
    body: "Import Word files, export to HTML, PDF, LaTeX, open Settings, and toggle the AI panel from this strip.",
    target: "app-toolbar",
  },
  {
    id: "formatting-toolbar",
    title: "Formatting & manuscript tools",
    body: "Bold, lists, tables, equations, page breaks—and shortcuts for citations, footnotes, bibliography, line numbers, and word counts.",
    target: "formatting-toolbar",
  },
  {
    id: "editor-canvas",
    title: "Your document",
    body: "Type here. Page layout, margins, and headers live in Page setup (layout icon). Selection tools appear when you highlight text.",
    target: "editor-canvas",
  },
  {
    id: "ai-panel",
    title: "AI panel",
    body: "Chat with the model, run document-wide tools, and apply suggestions while your text stays on the left. Drag the edge to resize.",
    target: "ai-panel",
  },
];

const TARGET_SELECTOR = {
  "app-toolbar": '[data-onboarding="app-toolbar"]',
  "formatting-toolbar": '[data-onboarding="formatting-toolbar"]',
  "editor-canvas": '[data-onboarding="editor-canvas"]',
  "ai-panel": '[data-onboarding="ai-panel"]',
} as const;

export function getOnboardingSelector(step: EditorOnboardingStep): string | null {
  if ("center" in step && step.center) return null;
  if ("target" in step) return TARGET_SELECTOR[step.target];
  return null;
}

export function shouldShowEditorOnboarding(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(EDITOR_ONBOARDING_STORAGE_KEY) !== "1";
  } catch {
    return true;
  }
}

export function markEditorOnboardingComplete() {
  try {
    window.localStorage.setItem(EDITOR_ONBOARDING_STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
}
