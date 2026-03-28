"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { Download, X } from "lucide-react";

const textareaClass =
  "w-full min-h-[min(50vh,28rem)] resize-y rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-[13px] leading-relaxed text-zinc-900 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 dark:border-surface-border dark:bg-zinc-950 dark:text-zinc-100 dark:focus:ring-accent/20";

function ModalLayer({
  children,
  onBackdropClick,
}: {
  children: React.ReactNode;
  onBackdropClick: () => void;
}) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center overflow-y-auto p-4 sm:p-6"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        aria-label="Close"
        onClick={onBackdropClick}
      />
      <div className="relative z-10 my-auto flex w-full max-w-4xl justify-center">{children}</div>
    </div>,
    document.body
  );
}

type Props = {
  open: boolean;
  onClose: () => void;
  initialTex: string;
  suggestedFilename: string;
};

export function LatexExportModal({ open, onClose, initialTex, suggestedFilename }: Props) {
  const id = useId();
  const [tex, setTex] = useState(initialTex);

  useEffect(() => {
    if (open) setTex(initialTex);
  }, [open, initialTex]);

  if (!open) return null;

  function downloadTex() {
    const blob = new Blob([tex], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = suggestedFilename.endsWith(".tex") ? suggestedFilename : `${suggestedFilename}.tex`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <ModalLayer onBackdropClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        className="w-full rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-surface-border dark:bg-surface-raised"
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-200 px-4 py-3 dark:border-surface-border">
          <div>
            <h2 id={`${id}-title`} className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              LaTeX preview
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              Generated from your <strong className="font-medium text-zinc-600 dark:text-zinc-300">open document</strong>.
              Columns, margins, and header/footer follow Page setup. Equation graphics from Word may need manual LaTeX;
              dollar math in the editor maps to{" "}
              <code className="rounded bg-zinc-100 px-1 font-mono dark:bg-surface-overlay">\(...\)</code>.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-surface-overlay dark:hover:text-zinc-200"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4">
          <textarea
            className={textareaClass}
            value={tex}
            onChange={(e) => setTex(e.target.value)}
            spellCheck={false}
            autoComplete="off"
          />
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-zinc-200 px-4 py-3 dark:border-surface-border">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-surface-overlay"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={downloadTex}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-muted"
          >
            <Download className="h-4 w-4" aria-hidden />
            Download .tex
          </button>
        </div>
      </div>
    </ModalLayer>
  );
}
