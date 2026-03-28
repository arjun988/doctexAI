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
import type { DocumentLayout } from "@/lib/documentLayout";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapExportedBody(body: string, layout: DocumentLayout): string {
  let out = "";
  if (layout.headerText.trim()) {
    out += `<header style="font-size:11pt;color:#444;border-bottom:1px solid #ddd;padding-bottom:8px;margin-bottom:16px;text-align:center;white-space:pre-wrap">${escapeHtml(layout.headerText)}</header>`;
  }
  out += `<article>${body}</article>`;
  if (layout.footerText.trim()) {
    out += `<footer style="font-size:11pt;color:#444;border-top:1px solid #ddd;padding-top:8px;margin-top:16px;text-align:center;white-space:pre-wrap">${escapeHtml(layout.footerText)}</footer>`;
  }
  return out;
}

type Props = {
  getHtml: () => string;
  setHtml: (html: string) => void;
  getLayout: () => DocumentLayout;
  onOpenSettings: () => void;
  panelOpen: boolean;
  onTogglePanel: () => void;
};

export function Toolbar({
  getHtml,
  setHtml,
  getLayout,
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
    const layout = getLayout();
    const wrapped = wrapExportedBody(html, layout);
    const pageSize = layout.orientation === "landscape" ? "A4 landscape" : "A4";
    const styles = `<style>
      @page { size: ${pageSize}; margin: ${layout.marginTop} ${layout.marginRight} ${layout.marginBottom} ${layout.marginLeft}; }
      body { font-family: Georgia, "Times New Roman", serif; color: #111; margin: 0; padding: 12px; box-sizing: border-box; }
      article { column-count: ${layout.columns}; column-gap: 1.25em; }
      table { border-collapse: collapse; width: 100%; }
      td, th { border: 1px solid #ccc; padding: 6px 8px; vertical-align: top; }
      img { max-width: 100%; height: auto; }
      .doc-page-break { break-after: page; page-break-after: always; height: 0; margin: 0; border: 0; }
      ul[data-type="taskList"] { list-style: none; padding-left: 0; }
      ul[data-type="taskList"] li { display: flex; gap: 0.5rem; align-items: flex-start; }
    </style>`;
    const blob = new Blob(
      [
        `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Document</title>${styles}</head><body>`,
        wrapped,
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
    const layout = getLayout();
    const wrapped = wrapExportedBody(html, layout);
    const styles = `<style>table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:6px 8px}article{column-count:${layout.columns};column-gap:1.25em}.doc-page-break{page-break-after:always}</style>`;
    const doc = `<!DOCTYPE html><html><head><meta charset="utf-8"/>${styles}</head><body>${wrapped}</body></html>`;
    try {
      const { asBlob } = await import("html-docx-js-typescript");
      const out = await asBlob(doc);
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
    <header className="flex h-11 w-full shrink-0 items-center gap-1 border-b border-surface-border bg-surface-raised px-2">
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
