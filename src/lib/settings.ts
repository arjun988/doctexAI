export const SETTINGS_KEY = "doctex-settings";

export type AiSettings = {
  apiKey: string;
  model: string;
  /** OpenAI-compatible base URL (default https://api.openai.com/v1) */
  baseUrl: string;
};

export const defaultAiSettings: AiSettings = {
  apiKey: "",
  model: "gpt-4o-mini",
  baseUrl: "https://api.openai.com/v1",
};

const defaults = defaultAiSettings;

export function loadSettings(): AiSettings {
  if (typeof window === "undefined") return { ...defaults };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...defaults };
    const parsed = JSON.parse(raw) as Partial<AiSettings>;
    return {
      apiKey: typeof parsed.apiKey === "string" ? parsed.apiKey : defaults.apiKey,
      model: typeof parsed.model === "string" ? parsed.model : defaults.model,
      baseUrl: typeof parsed.baseUrl === "string" ? parsed.baseUrl : defaults.baseUrl,
    };
  } catch {
    return { ...defaults };
  }
}

export function saveSettings(s: Partial<AiSettings>): AiSettings {
  const cur = loadSettings();
  const next: AiSettings = {
    apiKey: s.apiKey !== undefined ? s.apiKey : cur.apiKey,
    model: s.model !== undefined ? s.model : cur.model,
    baseUrl: s.baseUrl !== undefined ? s.baseUrl : cur.baseUrl,
  };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  return next;
}

export const DOC_KEY = "doctex-document-html";

export function loadDocumentHtml(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(DOC_KEY);
}

export function saveDocumentHtml(html: string): void {
  localStorage.setItem(DOC_KEY, html);
}
