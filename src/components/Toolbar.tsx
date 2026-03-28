"use client";

import { useRef } from "react";
import mammoth from "mammoth";
import {
  FileUp,
  FileDown,
  FileCode,
  Settings,
  Trash2,
  PanelRight,
} from "lucide-react";
import { saveDocumentHtml } from "@/lib/settings";

type Props = {
  getHtml: () => string;
  setHtml: (html: string) => void;
  onOpenSettings: () => void;
  panelOpen: boolean;
  onTogglePanel: () => void;
};

export function Toolbar({
  getHtml,
  setHtml,
  onOpenSettings,
  panelOpen,
  onTogglePanel,
}: Props) {
  const importRef = useRef<HTMLInputElement>(null);

  async function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const buf = await file.arrayBuffer();
    const { value: html } = await mammoth.convertToHtml({ arrayBuffer: buf });
    setHtml(html);
    saveDocumentHtml(html);
  }

  function downloadHtml() {
    const html = getHtml();
    const blob = new Blob(
      [
        `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Document</title></head><body>`,
        html,
        `</body></html>`,
      ],
      { type: "text/html;charset=utf-8" }
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "document.html";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function downloadDocx() {
    const html = getHtml();
    const wrapped = `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body>${html}</body></html>`;
    try {
      const { asBlob } = await import("html-docx-js-typescript");
      const out = await asBlob(wrapped);
      const blob = out instanceof Blob ? out : new Blob([new Uint8Array(out)]);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "document.docx";
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      downloadHtml();
    }
  }

  function clearDoc() {
    if (typeof window !== "undefined" && !window.confirm("Clear the document?")) return;
    const empty = "<p></p>";
    setHtml(empty);
    saveDocumentHtml(empty);
  }

  return (
    <header className="flex h-11 shrink-0 items-center gap-1 border-b border-surface-border bg-surface-raised px-2">
      <span className="mr-2 px-2 font-mono text-xs font-semibold tracking-tight text-zinc-200">
        DocTex
      </span>
      <input
        ref={importRef}
        type="file"
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={onImportFile}
      />
      <button
        type="button"
        onClick={() => importRef.current?.click()}
        className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-zinc-300 hover:bg-surface-overlay hover:text-zinc-100"
        title="Import .docx"
      >
        <FileUp className="h-3.5 w-3.5" />
        Import
      </button>
      <button
        type="button"
        onClick={downloadHtml}
        className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-zinc-300 hover:bg-surface-overlay hover:text-zinc-100"
        title="Export HTML"
      >
        <FileCode className="h-3.5 w-3.5" />
        HTML
      </button>
      <button
        type="button"
        onClick={() => void downloadDocx()}
        className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-zinc-300 hover:bg-surface-overlay hover:text-zinc-100"
        title="Export Word"
      >
        <FileDown className="h-3.5 w-3.5" />
        Word
      </button>
      <div className="flex-1" />
      <button
        type="button"
        onClick={onTogglePanel}
        className={`flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs ${
          panelOpen ? "bg-surface-overlay text-zinc-100" : "text-zinc-400 hover:bg-surface-overlay"
        }`}
        title="Toggle AI panel"
      >
        <PanelRight className="h-3.5 w-3.5" />
        AI
      </button>
      <button
        type="button"
        onClick={onOpenSettings}
        className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-zinc-300 hover:bg-surface-overlay hover:text-zinc-100"
        title="Settings"
      >
        <Settings className="h-3.5 w-3.5" />
        Settings
      </button>
      <button
        type="button"
        onClick={clearDoc}
        className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-zinc-500 hover:bg-red-950/40 hover:text-red-300"
        title="Clear document"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </header>
  );
}
