"use client";

import { useEffect, useState } from "react";
import type { AiSettings } from "@/lib/settings";
import { loadSettings, saveSettings } from "@/lib/settings";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: (s: AiSettings) => void;
};

export function SettingsModal({ open, onClose, onSaved }: Props) {
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [baseUrl, setBaseUrl] = useState("");

  useEffect(() => {
    if (!open) return;
    const s = loadSettings();
    setApiKey(s.apiKey);
    setModel(s.model);
    setBaseUrl(s.baseUrl);
  }, [open]);

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next = saveSettings({ apiKey, model, baseUrl });
    onSaved(next);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/60"
        aria-label="Close settings"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg rounded-xl border border-surface-border bg-surface-raised shadow-2xl">
        <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
          <h2 className="text-sm font-semibold text-zinc-100">AI settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-surface-overlay hover:text-zinc-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-4">
          <p className="text-xs text-zinc-500">
            Keys stay in your browser (localStorage). The Next.js API route forwards requests
            to your chosen OpenAI-compatible endpoint.
          </p>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-zinc-400">API key</span>
            <input
              type="password"
              autoComplete="off"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              placeholder="sk-…"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-zinc-400">Model</span>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-zinc-100 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              placeholder="gpt-4o-mini"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-zinc-400">
              Base URL (OpenAI-compatible)
            </span>
            <input
              type="url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-zinc-100 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              placeholder="https://api.openai.com/v1"
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-1.5 text-sm text-zinc-400 hover:bg-surface-overlay hover:text-zinc-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-muted"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
