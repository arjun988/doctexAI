"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DocEditor, type EditorApi } from "@/components/DocEditor";
import { Toolbar } from "@/components/Toolbar";
import { PromptPanel } from "@/components/PromptPanel";
import { SettingsModal } from "@/components/SettingsModal";
import { defaultAiSettings, loadSettings, type AiSettings } from "@/lib/settings";

export default function Home() {
  const [settings, setSettings] = useState<AiSettings>(defaultAiSettings);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const apiRef = useRef<EditorApi | null>(null);

  const onEditorReady = useCallback((api: EditorApi) => {
    apiRef.current = api;
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
        onOpenSettings={() => setSettingsOpen(true)}
        panelOpen={panelOpen}
        onTogglePanel={() => setPanelOpen((p) => !p)}
      />
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-zinc-200/90 p-4 md:p-10">
          <div className="mx-auto max-w-3xl rounded-lg border border-zinc-200 bg-white px-6 py-8 shadow-sm min-h-[min(100%,calc(100vh-10rem))] md:px-8 md:py-10">
            <DocEditor onReady={onEditorReady} />
          </div>
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
    </div>
  );
}
