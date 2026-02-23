"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import FileUpload from "@/components/upload/FileUpload";
import ViewerContainer from "@/components/viewer/ViewerContainer";
import StatsPanel from "@/components/panels/StatsPanel";
import WarningsPanel from "@/components/panels/WarningsPanel";
import MetadataPanel from "@/components/panels/MetadataPanel";
import NodeInfoPanel from "@/components/panels/NodeInfoPanel";
import Toolbar from "@/components/toolbar/Toolbar";
import ContextMenu from "@/components/viewer/ContextMenu";
import NeuromorphoBrowser from "@/components/neuromorpho/NeuromorphoBrowser";
import { useNeuronStore } from "@/store/useNeuronStore";

const NeuronCanvas = dynamic(() => import("@/components/viewer/NeuronCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <p className="text-text-muted">Loading 3D viewer...</p>
    </div>
  ),
});

interface ContextMenuState {
  nodeId: number;
  x: number;
  y: number;
}

type SidebarTab = "upload" | "browse";

export default function Home() {
  const hasData = useNeuronStore((s) => s.tree.size > 0);
  const error = useNeuronStore((s) => s.error);
  const clearSelection = useNeuronStore((s) => s.clearSelection);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("upload");
  const [loadingNeuron, setLoadingNeuron] = useState<string | null>(null);

  const handleLoadNeuron = useCallback(async (name: string) => {
    setLoadingNeuron(name);
    await useNeuronStore.getState().loadFromNeuromorpho(name);
    setLoadingNeuron(null);
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't handle shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.target instanceof HTMLSelectElement) return;

      if (e.key === "Escape") {
        if (contextMenu) {
          setContextMenu(null);
          return;
        }
        clearSelection();
        return;
      }

      // Undo: Ctrl+Z
      if (e.key === "z" && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault();
        useNeuronStore.getState().undo();
        return;
      }

      // Redo: Ctrl+Shift+Z
      if (e.key === "z" && (e.ctrlKey || e.metaKey) && e.shiftKey) {
        e.preventDefault();
        useNeuronStore.getState().redo();
        return;
      }

      // Delete selected nodes
      if (e.key === "Delete" || e.key === "Backspace") {
        const { selection, deleteNodes } = useNeuronStore.getState();
        if (selection.size > 0) {
          e.preventDefault();
          deleteNodes(Array.from(selection));
        }
        return;
      }

      // Tool shortcuts (only when no modifier keys)
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        const key = e.key.toLowerCase();
        if (key === "v") {
          useNeuronStore.getState().setActiveTool("select");
          return;
        }
        if (key === "m") {
          useNeuronStore.getState().setActiveTool("move");
          return;
        }
        if (key === "i") {
          useNeuronStore.getState().setActiveTool("insert");
          return;
        }
        if (key === "x") {
          useNeuronStore.getState().setActiveTool("delete");
          return;
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [clearSelection, contextMenu]);

  // Listen for custom context menu events dispatched from NeuronRenderer
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as ContextMenuState;
      setContextMenu(detail);
    };
    window.addEventListener("neuron-context-menu", handler);
    return () => window.removeEventListener("neuron-context-menu", handler);
  }, []);

  if (!hasData) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
        <h1 className="text-4xl font-bold tracking-tight">NeuroTrace3D</h1>
        <p className="text-text-muted text-lg">3D neuron morphology viewer</p>
        <div className="w-96">
          <FileUpload />
        </div>
        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}
        <SampleLoader />
      </main>
    );
  }

  return (
    <>
      <ViewerContainer
        toolbar={<Toolbar />}
        canvas={<NeuronCanvas />}
        panels={
          <>
            {/* Sidebar tab toggle */}
            <div className="border-border flex rounded-lg border">
              <TabButton active={sidebarTab === "upload"} onClick={() => setSidebarTab("upload")}>
                File Upload
              </TabButton>
              <TabButton active={sidebarTab === "browse"} onClick={() => setSidebarTab("browse")}>
                NeuroMorpho
              </TabButton>
            </div>

            {/* Tab content */}
            {sidebarTab === "upload" ? (
              <FileUpload />
            ) : (
              <NeuromorphoBrowser
                onLoadNeuron={handleLoadNeuron}
                loadingNeuron={loadingNeuron}
              />
            )}

            {error && (
              <div className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {error}
              </div>
            )}
            <StatsPanel />
            <MetadataPanel />
            <NodeInfoPanel />
            <WarningsPanel />
          </>
        }
      />
      {contextMenu && (
        <ContextMenu
          nodeId={contextMenu.nodeId}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className={`flex-1 px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "bg-accent text-white"
          : "text-text-muted hover:bg-surface-hover"
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

/** Helper to load bundled sample files */
function SampleLoader() {
  const loadSWC = useNeuronStore((s) => s.loadSWC);
  const samples = ["sample1.swc", "sample2.swc", "sample3.swc"];

  const handleClick = async (name: string) => {
    const res = await fetch(`/samples/${name}`);
    if (!res.ok) return;
    const text = await res.text();
    loadSWC(text, name);
  };

  return (
    <div className="flex gap-3">
      {samples.map((name) => (
        <button
          key={name}
          className="border-border bg-surface hover:bg-surface-hover rounded-lg border px-4 py-2 text-sm transition-colors"
          onClick={() => handleClick(name)}
        >
          {name}
        </button>
      ))}
    </div>
  );
}
