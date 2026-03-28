"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

const inputClass =
  "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 dark:border-surface-border dark:bg-surface dark:text-zinc-100 dark:focus:ring-accent/20";

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
