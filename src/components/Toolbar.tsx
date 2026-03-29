"use client";

import { useEffect, useRef, useState } from "react";
import mammoth from "mammoth";
import {
  ChevronDown,
  FileUp,
  FileDown,
  FileCode,
  Settings,
  PanelRight,
  Download,
  Sigma,
} from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { saveDocumentHtml } from "@/lib/settings";
import type { DocumentLayout } from "@/lib/documentLayout";
import {
  exportDocumentToPdf,
  getHtmlExportStyles,
  wrapExportedBody,
} from "@/lib/documentExport";
import { htmlToLatexDocument } from "@/lib/htmlToLatex";
import { LatexExportModal } from "@/components/LatexExportModal";
import Image from "next/image";

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
  const exportWrapRef = useRef<HTMLDivElement>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [latexModal, setLatexModal] = useState<{
    open: boolean;
    tex: string;
    filename: string;
  }>({ open: false, tex: "", filename: "document.tex" });

  useEffect(() => {
    if (!exportOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!exportWrapRef.current?.contains(e.target as Node)) setExportOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [exportOpen]);

  async function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const buf = await file.arrayBuffer();
    const { value: html } = await mammoth.convertToHtml({ arrayBuffer: buf });
    setHtml(html);
    saveDocumentHtml(html);
  }

  function openLatexPreviewFromEditor() {
    const html = getHtml();
    const tex = htmlToLatexDocument(html, {
      title: "Document",
      layout: getLayout(),
    });
    setLatexModal({ open: true, tex, filename: "document.tex" });
  }

  function downloadHtml() {
    const html = getHtml();
    const layout = getLayout();
    const wrapped = wrapExportedBody(html, layout);
    const styles = getHtmlExportStyles(layout);
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

  async function downloadPdf() {
    if (pdfBusy) return;
    setPdfBusy(true);
    try {
      const html = getHtml();
      const layout = getLayout();
      await exportDocumentToPdf(html, layout);
    } catch {
      /* user sees no file — optional: toast */
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <header
      data-onboarding="app-toolbar"
      className="flex h-11 w-full shrink-0 items-center gap-1 border-b border-zinc-200 bg-white px-2 dark:border-surface-border dark:bg-surface-raised"
    >
      <Link
        href="/"
        className="mr-2 flex shrink-0 items-center gap-2 rounded-md px-2 py-1 font-mono text-xs font-semibold tracking-tight text-zinc-800 transition hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-200 dark:hover:bg-surface-overlay dark:hover:text-white"
        title="Home"
      >
        <Image src="/doctex.png" alt="" width={20} height={20} className="h-5 w-5 rounded-sm" />
        DocTex
      </Link>
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
        className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-surface-overlay dark:hover:text-zinc-100"
        title="Import .docx"
      >
        <FileUp className="h-3.5 w-3.5" />
        Import
      </button>
      <div ref={exportWrapRef} className="relative">
        <button
          type="button"
          aria-expanded={exportOpen}
          aria-haspopup="menu"
          onClick={() => setExportOpen((v) => !v)}
          className={`flex items-center gap-1 rounded-md px-2 py-1.5 text-xs transition ${
            exportOpen
              ? "bg-zinc-200 text-zinc-900 dark:bg-surface-overlay dark:text-zinc-100"
              : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-surface-overlay dark:hover:text-zinc-100"
          }`}
          title="Export the open document (typed, imported Word, or both)"
        >
          Export
          <ChevronDown
            className={`h-3.5 w-3.5 shrink-0 opacity-70 transition-transform ${exportOpen ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
        {exportOpen ? (
          <div
            role="menu"
            aria-label="Export format"
            className="absolute left-0 top-full z-[200] mt-1 min-w-[11rem] overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-surface-border dark:bg-zinc-900"
          >
            <button
              type="button"
              role="menuitem"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                downloadHtml();
                setExportOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-zinc-800 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <FileCode className="h-3.5 w-3.5 shrink-0 text-zinc-500 dark:text-zinc-400" />
              HTML
            </button>
            <button
              type="button"
              role="menuitem"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                void downloadDocx();
                setExportOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-zinc-800 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <FileDown className="h-3.5 w-3.5 shrink-0 text-zinc-500 dark:text-zinc-400" />
              Word (.docx)
            </button>
            <button
              type="button"
              role="menuitem"
              disabled={pdfBusy}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                void downloadPdf();
                setExportOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-zinc-800 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-45 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <Download className="h-3.5 w-3.5 shrink-0 text-zinc-500 dark:text-zinc-400" />
              {pdfBusy ? "PDF (preparing…)" : "PDF"}
            </button>
            <button
              type="button"
              role="menuitem"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                openLatexPreviewFromEditor();
                setExportOpen(false);
              }}
              title="Preview and download LaTeX for the open document (respects Page setup)."
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-zinc-800 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <Sigma className="h-3.5 w-3.5 shrink-0 text-zinc-500 dark:text-zinc-400" />
              LaTeX (.tex)
            </button>
          </div>
        ) : null}
      </div>
      <div className="flex-1" />
      <ThemeToggle />
      <button
        type="button"
        onClick={onTogglePanel}
        className={`flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs ${
          panelOpen
            ? "bg-zinc-200 text-zinc-900 dark:bg-surface-overlay dark:text-zinc-100"
            : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-surface-overlay"
        }`}
        title="Toggle AI panel"
      >
        <PanelRight className="h-3.5 w-3.5" />
        AI
      </button>
      <button
        type="button"
        onClick={onOpenSettings}
        className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-surface-overlay dark:hover:text-zinc-100"
        title="Settings"
      >
        <Settings className="h-3.5 w-3.5" />
        Settings
      </button>
      <LatexExportModal
        open={latexModal.open}
        onClose={() => setLatexModal((m) => ({ ...m, open: false }))}
        initialTex={latexModal.tex}
        suggestedFilename={latexModal.filename}
      />
    </header>
  );
}
