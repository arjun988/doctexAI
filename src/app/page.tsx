"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DocEditor, type EditorApi } from "@/components/DocEditor";
import { Toolbar } from "@/components/Toolbar";
import { PromptPanel } from "@/components/PromptPanel";
import { SettingsModal } from "@/components/SettingsModal";
import { LayoutModal } from "@/components/editor/LayoutModal";
import { defaultAiSettings, loadSettings, type AiSettings } from "@/lib/settings";
import {
  defaultDocumentLayout,
  loadDocumentLayout,
  saveDocumentLayout,
  type DocumentLayout,
} from "@/lib/documentLayout";

export default function Home() {
  const [settings, setSettings] = useState<AiSettings>(defaultAiSettings);
  const [documentLayout, setDocumentLayout] = useState<DocumentLayout>(defaultDocumentLayout);

  useEffect(() => {
    setSettings(loadSettings());
    setDocumentLayout(loadDocumentLayout());
  }, []);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [layoutOpen, setLayoutOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const apiRef = useRef<EditorApi | null>(null);

  const onEditorReady = useCallback((api: EditorApi) => {
    apiRef.current = api;
  }, []);

  const onLayoutSave = useCallback((next: DocumentLayout) => {
    saveDocumentLayout(next);
    setDocumentLayout(next);
  }, []);

  const getDocumentHtml = useCallback(() => apiRef.current?.getHtml() ?? "", []);
  const getSelectionText = useCallback(() => apiRef.current?.getSelectionText() ?? "", []);
  const insertAtCursor = useCallback((text: string) => {
    apiRef.current?.insertAtCursor(text);
  }, []);

  return (
    <div className="flex h-screen min-h-0 flex-col bg-surface">
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
            className="min-h-0"
          />
        </main>
        {panelOpen && (
          <aside className="flex h-[min(42vh,320px)] shrink-0 flex-col border-t border-surface-border md:h-auto md:w-[min(100%,380px)] md:border-l md:border-t-0">
            <PromptPanel
              settings={settings}
              getDocumentHtml={getDocumentHtml}
              getSelectionText={getSelectionText}
              insertAtCursor={insertAtCursor}
            />
          </aside>
        )}
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
