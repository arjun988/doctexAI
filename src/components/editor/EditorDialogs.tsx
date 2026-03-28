"use client";

import katex from "katex";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal, flushSync } from "react-dom";
import { X } from "lucide-react";
import { formatMathForEditor } from "@/lib/mathEquation";
import {
  MATH_SYMBOL_PALETTE,
  type MathPaletteItem,
} from "@/lib/mathSymbolPalette";

const inputClass =
  "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 dark:border-surface-border dark:bg-surface dark:text-zinc-100 dark:focus:ring-accent/20";

const textareaClass = `${inputClass} min-h-[7.5rem] resize-y font-mono leading-relaxed`;

const GRID_SIZE = 10;

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
      <div className="relative z-10 my-auto flex w-full max-w-lg justify-center">{children}</div>
    </div>,
    document.body
  );
}

type TableInsertDialogProps = {
  open: boolean;
  onClose: () => void;
  onInsert: (rows: number, cols: number) => void;
};

/** Word-style grid: hover to preview size, click cell to insert. */
export function TableInsertDialog({ open, onClose, onInsert }: TableInsertDialogProps) {
  const id = useId();
  const [hover, setHover] = useState({ row: -1, col: -1 });

  useEffect(() => {
    if (open) setHover({ row: -1, col: -1 });
  }, [open]);

  if (!open) return null;

  const rows = hover.row + 1;
  const cols = hover.col + 1;
  const showPreview = hover.row >= 0 && hover.col >= 0;

  function pick(r: number, c: number) {
    onInsert(r + 1, c + 1);
    onClose();
  }

  return (
    <ModalLayer onBackdropClick={onClose}>
      <div
        role="dialog"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-desc`}
        className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-4 shadow-2xl dark:border-surface-border dark:bg-surface-raised"
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 id={`${id}-title`} className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Insert table
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-surface-overlay"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p id={`${id}-desc`} className="mb-3 text-xs text-zinc-600 dark:text-zinc-500">
          Move across the grid to choose the table size, then click a cell to insert (like Word).
        </p>

        <div
          className="inline-block rounded-lg border border-zinc-300 bg-zinc-100 p-1.5 dark:border-zinc-600 dark:bg-zinc-800/80"
          onMouseLeave={() => setHover({ row: -1, col: -1 })}
        >
          <div
            className="grid gap-0.5"
            style={{
              gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => {
              const r = Math.floor(i / GRID_SIZE);
              const c = i % GRID_SIZE;
              const inSelection = hover.row >= 0 && r <= hover.row && c <= hover.col;
              return (
                <button
                  key={i}
                  type="button"
                  title={`${r + 1} × ${c + 1} table`}
                  className={`h-4 w-4 rounded-sm border transition-colors sm:h-5 sm:w-5 ${
                    inSelection
                      ? "border-blue-600 bg-blue-500 dark:border-blue-400 dark:bg-blue-600"
                      : "border-zinc-300 bg-white hover:border-zinc-400 dark:border-zinc-600 dark:bg-zinc-900"
                  }`}
                  onMouseEnter={() => setHover({ row: r, col: c })}
                  onClick={() => pick(r, c)}
                />
              );
            })}
          </div>
        </div>

        <p className="mt-3 text-center text-xs font-medium text-zinc-700 dark:text-zinc-300">
          {showPreview ? (
            <>
              Insert{" "}
              <span className="tabular-nums text-accent">
                {rows} × {cols}
              </span>{" "}
              table
            </>
          ) : (
            <span className="text-zinc-500">Hover to select size, then click</span>
          )}
        </p>

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-surface-overlay"
          >
            Cancel
          </button>
        </div>
      </div>
    </ModalLayer>
  );
}

type LinkUrlDialogProps = {
  open: boolean;
  onClose: () => void;
  initialUrl: string;
  onApply: (url: string) => void;
};

export function LinkUrlDialog({ open, onClose, initialUrl, onApply }: LinkUrlDialogProps) {
  const id = useId();
  const [url, setUrl] = useState(initialUrl);

  useEffect(() => {
    if (open) setUrl(initialUrl || "https://");
  }, [open, initialUrl]);

  if (!open) return null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onApply(url.trim());
    onClose();
  }

  function remove() {
    onApply("");
    onClose();
  }

  return (
    <ModalLayer onBackdropClick={onClose}>
      <div
        role="dialog"
        aria-labelledby={`${id}-link-title`}
        className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-4 shadow-2xl dark:border-surface-border dark:bg-surface-raised"
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 id={`${id}-link-title`} className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Insert link
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-surface-overlay"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-2 text-xs text-zinc-600 dark:text-zinc-500">
          Paste or type a web address. Use Remove link to clear.
        </p>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label htmlFor={`${id}-url`} className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Address
            </label>
            <input
              id={`${id}-url`}
              type="text"
              inputMode="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className={inputClass}
              autoComplete="url"
              autoFocus
            />
          </div>
          <div className="flex flex-wrap justify-end gap-2 pt-1">
            {initialUrl ? (
              <button
                type="button"
                onClick={remove}
                className="rounded-lg px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
              >
                Remove link
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-surface-overlay"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-muted"
            >
              OK
            </button>
          </div>
        </form>
      </div>
    </ModalLayer>
  );
}

type MathEquationDialogProps = {
  open: boolean;
  onClose: () => void;
  initialLatex: string;
  initialDisplay: boolean;
  replaceSelection: boolean;
  onInsert: (insertedText: string, replaceSelection: boolean) => void;
};

export function MathEquationDialog({
  open,
  onClose,
  initialLatex,
  initialDisplay,
  replaceSelection,
  onInsert,
}: MathEquationDialogProps) {
  const id = useId();
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [latex, setLatex] = useState("");
  const [display, setDisplay] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [paletteTab, setPaletteTab] = useState(MATH_SYMBOL_PALETTE[0].id);

  useEffect(() => {
    if (!open) return;
    setLatex(initialLatex);
    setDisplay(initialDisplay);
    setPaletteTab(MATH_SYMBOL_PALETTE[0].id);
  }, [open, initialLatex, initialDisplay]);

  useEffect(() => {
    if (!open) return;
    const src = latex.trim() || "\\text{preview}";
    try {
      setPreviewHtml(katex.renderToString(src, { throwOnError: false, displayMode: display }));
    } catch {
      setPreviewHtml("<span class=\"text-red-600 dark:text-red-400\">Invalid LaTeX</span>");
    }
  }, [latex, display, open]);

  const insertSnippet = useCallback(
    (item: MathPaletteItem) => {
      const text = item.insert;
      const cursor = item.cursorInInsert ?? text.length;
      const el = taRef.current;
      if (!el) {
        setLatex((prev) => prev + text);
        return;
      }
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const next = latex.slice(0, start) + text + latex.slice(end);
      flushSync(() => setLatex(next));
      const pos = start + cursor;
      queueMicrotask(() => {
        el.focus();
        el.setSelectionRange(pos, pos);
      });
    },
    [latex]
  );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const wrapped = formatMathForEditor(latex, display);
    if (!wrapped) return;
    onInsert(wrapped, replaceSelection);
    onClose();
  }

  const activePalette =
    MATH_SYMBOL_PALETTE.find((t) => t.id === paletteTab) ?? MATH_SYMBOL_PALETTE[0];

  if (!open) return null;

  return (
    <ModalLayer onBackdropClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-math-title`}
        className="w-full max-w-3xl rounded-xl border border-zinc-200 bg-white p-4 shadow-2xl dark:border-surface-border dark:bg-surface-raised"
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 id={`${id}-math-title`} className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Equation
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-surface-overlay"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-3 text-xs text-zinc-600 dark:text-zinc-500">
          KaTeX LaTeX: <code className="rounded bg-zinc-100 px-1 dark:bg-surface-overlay">$…$</code> inline,{" "}
          <code className="rounded bg-zinc-100 px-1 dark:bg-surface-overlay">$$…$$</code> display. Click symbols to
          insert; templates place the caret inside braces.
        </p>
        <form onSubmit={submit} className="space-y-3">
          <fieldset className="flex flex-wrap gap-4">
            <legend className="sr-only">Layout</legend>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200">
              <input
                type="radio"
                name={`${id}-math-layout`}
                checked={!display}
                onChange={() => setDisplay(false)}
                className="accent-accent"
              />
              Inline
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200">
              <input
                type="radio"
                name={`${id}-math-layout`}
                checked={display}
                onChange={() => setDisplay(true)}
                className="accent-accent"
              />
              Display
            </label>
          </fieldset>

          <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-surface-border">
            <div
              className="flex gap-0.5 overflow-x-auto border-b border-zinc-200 bg-zinc-50/90 px-1.5 py-1.5 dark:border-surface-border dark:bg-surface-overlay"
              role="tablist"
              aria-label="Symbol categories"
            >
              {MATH_SYMBOL_PALETTE.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={paletteTab === tab.id}
                  onClick={() => setPaletteTab(tab.id)}
                  className={`shrink-0 rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
                    paletteTab === tab.id
                      ? "bg-white text-zinc-900 shadow-sm dark:bg-surface-raised dark:text-zinc-100"
                      : "text-zinc-600 hover:bg-zinc-100/80 dark:text-zinc-400 dark:hover:bg-surface-overlay"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="max-h-[11rem] overflow-y-auto p-2">
              <div
                className="grid grid-cols-6 gap-1 sm:grid-cols-8 md:grid-cols-10"
                role="tabpanel"
              >
                {activePalette.items.map((item, idx) => (
                  <button
                    key={`${activePalette.id}-${idx}-${item.insert}`}
                    type="button"
                    title={item.title ?? item.insert}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => insertSnippet(item)}
                    className="flex min-h-[2rem] min-w-0 items-center justify-center rounded border border-zinc-200 bg-white px-1 py-1 text-center text-[13px] leading-tight text-zinc-800 transition hover:border-accent/50 hover:bg-accent/5 dark:border-surface-border dark:bg-surface dark:text-zinc-100 dark:hover:bg-surface-overlay"
                  >
                    <span className="truncate font-mono">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label htmlFor={`${id}-latex`} className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              LaTeX
            </label>
            <textarea
              ref={taRef}
              id={`${id}-latex`}
              value={latex}
              onChange={(e) => setLatex(e.target.value)}
              placeholder={String.raw`e.g. \int_0^1 x^2\,dx = \frac{1}{3}`}
              className={textareaClass}
              rows={5}
              autoFocus
            />
          </div>
          <div>
            <span className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">Preview</span>
            <div
              className="min-h-[3rem] overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-50/90 px-3 py-2 dark:border-surface-border dark:bg-surface-overlay"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-surface-overlay"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!latex.trim()}
              className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-muted disabled:cursor-not-allowed disabled:opacity-40"
            >
              Insert
            </button>
          </div>
        </form>
      </div>
    </ModalLayer>
  );
}
