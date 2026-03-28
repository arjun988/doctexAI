"use client";

type Props = {
  onMouseDown: (e: React.MouseEvent) => void;
};

/** Vertical drag handle on the left edge of the AI panel (desktop). */
export function AiPanelResizeHandle({ onMouseDown }: Props) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize AI panel"
      onMouseDown={onMouseDown}
      className="group relative hidden w-3 shrink-0 cursor-col-resize md:block"
    >
      <div className="absolute inset-y-8 left-1/2 w-1 -translate-x-1/2 rounded-full bg-zinc-300/80 transition group-hover:bg-accent/60 dark:bg-zinc-600 dark:group-hover:bg-accent/50" />
    </div>
  );
}
