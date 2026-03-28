"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PromptPanelHandle } from "@/components/PromptPanel";
import { DocEditor, type EditorApi } from "@/components/DocEditor";
import { Toolbar } from "@/components/Toolbar";
import { PromptPanel } from "@/components/PromptPanel";
import { SettingsModal } from "@/components/SettingsModal";
import { LayoutModal } from "@/components/editor/LayoutModal";
import { AiPanelResizeHandle } from "@/components/AiPanelResizeHandle";
import { defaultAiSettings, loadSettings, type AiSettings } from "@/lib/settings";
import {
  defaultDocumentLayout,
  loadDocumentLayout,
  saveDocumentLayout,
  type DocumentLayout,
} from "@/lib/documentLayout";

const PANEL_WIDTH_KEY = "doctex-ai-panel-width";

function clampPanelWidth(px: number): number {
  if (typeof window === "undefined") return px;
  const max = Math.min(720, window.innerWidth - 320);
  return Math.min(max, Math.max(280, px));
}

export default function EditorPage() {
  const [settings, setSettings] = useState<AiSettings>(defaultAiSettings);
  const [documentLayout, setDocumentLayout] = useState<DocumentLayout>(defaultDocumentLayout);

  useEffect(() => {
    setSettings(loadSettings());
    setDocumentLayout(loadDocumentLayout());
  }, []);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [layoutOpen, setLayoutOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [panelWidth, setPanelWidth] = useState(400);
  const [resizing, setResizing] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const dragStartRef = useRef<{ x: number; w: number } | null>(null);
  const widthRef = useRef(400);
  const apiRef = useRef<EditorApi | null>(null);
  const promptPanelRef = useRef<PromptPanelHandle>(null);

  useEffect(() => {
    widthRef.current = panelWidth;
  }, [panelWidth]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PANEL_WIDTH_KEY);
      if (raw) {
        const n = parseInt(raw, 10);
        if (!Number.isNaN(n)) {
          const w = clampPanelWidth(n);
          setPanelWidth(w);
          widthRef.current = w;
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    setIsDesktop(mq.matches);
    const onChange = () => setIsDesktop(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!resizing) return;
    const onMove = (e: MouseEvent) => {
      const start = dragStartRef.current;
      if (!start) return;
      const dx = start.x - e.clientX;
      const next = clampPanelWidth(start.w + dx);
      setPanelWidth(next);
      widthRef.current = next;
    };
    const onUp = () => {
      setResizing(false);
      dragStartRef.current = null;
      try {
        localStorage.setItem(PANEL_WIDTH_KEY, String(widthRef.current));
      } catch {
        /* ignore */
      }
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [resizing]);

  const onResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragStartRef.current = { x: e.clientX, w: panelWidth };
      setResizing(true);
    },
    [panelWidth]
  );

  const onEditorReady = useCallback((api: EditorApi) => {
    apiRef.current = api;
  }, []);

  const onLayoutSave = useCallback((next: DocumentLayout) => {
    saveDocumentLayout(next);
    setDocumentLayout(next);
  }, []);

  const getDocumentHtml = useCallback(() => apiRef.current?.getHtml() ?? "", []);
  const getSelectionText = useCallback(() => apiRef.current?.getSelectionText() ?? "", []);
  const getSelectionRange = useCallback(() => apiRef.current?.getSelectionRange() ?? null, []);
  const applyAiHtml = useCallback(
    (
      html: string,
      target: { type: "document" } | { type: "range"; from: number; to: number }
    ) => {
      apiRef.current?.applyAiHtml(html, target);
    },
    []
  );

  return (
    <div className="flex h-screen min-h-0 flex-col bg-zinc-100 dark:bg-surface">
      <Toolbar
        getHtml={() => apiRef.current?.getHtml() ?? ""}
        setHtml={(html) => apiRef.current?.setHtml(html)}
        getLayout={() => documentLayout}
        onOpenSettings={() => setSettingsOpen(true)}
        panelOpen={panelOpen}
        onTogglePanel={() => setPanelOpen((p) => !p)}
      />
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <DocEditor
            layout={documentLayout}
            onOpenPageSetup={() => setLayoutOpen(true)}
            onReady={onEditorReady}
            onAiTool={(tool) => promptPanelRef.current?.runTool(tool)}
            className="min-h-0"
          />
        </main>
        {panelOpen && <AiPanelResizeHandle onMouseDown={onResizeMouseDown} />}
        <aside
          data-ai-panel
          className={`flex h-[min(42vh,320px)] shrink-0 flex-col overflow-hidden border-t border-zinc-200 bg-white dark:border-surface-border dark:bg-surface md:h-auto md:min-w-[280px] md:max-w-[min(90vw,720px)] md:rounded-l-xl md:border-l md:border-t-0 md:shadow-[inset_1px_0_0_rgba(0,0,0,0.04)] dark:md:shadow-[inset_1px_0_0_rgba(255,255,255,0.04)] ${
            resizing ? "select-none md:will-change-[width]" : ""
          } ${!panelOpen ? "hidden" : ""}`}
          style={
            isDesktop
              ? { width: panelWidth }
              : { width: "100%", maxWidth: "100%" }
          }
        >
          <PromptPanel
            ref={promptPanelRef}
            settings={settings}
            getDocumentHtml={getDocumentHtml}
            getSelectionText={getSelectionText}
            getSelectionRange={getSelectionRange}
            applyAiHtml={applyAiHtml}
          />
        </aside>
      </div>
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSaved={(s) => setSettings(s)}
      />
      <LayoutModal
        open={layoutOpen}
        onClose={() => setLayoutOpen(false)}
        layout={documentLayout}
        onSave={onLayoutSave}
      />
    </div>
  );
}
