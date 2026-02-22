"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import FileUpload from "@/components/upload/FileUpload";
import ViewerContainer from "@/components/viewer/ViewerContainer";
import StatsPanel from "@/components/panels/StatsPanel";
import WarningsPanel from "@/components/panels/WarningsPanel";
import MetadataPanel from "@/components/panels/MetadataPanel";
import NodeInfoPanel from "@/components/panels/NodeInfoPanel";
import { useNeuronData } from "@/hooks/useNeuronData";
import { useNeuronSelection } from "@/hooks/useNeuronSelection";

const NeuronCanvas = dynamic(() => import("@/components/viewer/NeuronCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <p className="text-text-muted">Loading 3D viewer...</p>
    </div>
  ),
});

export default function Home() {
  const { result, stats, warnings, filename, loading, error, loadFile } = useNeuronData();
  const {
    hoveredId,
    selectedIds,
    focusTarget,
    handleHover,
    handleClick,
    handleDoubleClick,
    clearSelection,
    handleFocusDone,
  } = useNeuronSelection(result);

  // Escape key clears selection
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") clearSelection();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [clearSelection]);

  const panels = result ? (
    <>
      <FileUpload onFile={loadFile} filename={filename} loading={loading} />
      {error && (
        <div className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}
      {stats && <StatsPanel stats={stats} />}
      <MetadataPanel metadata={result.metadata} />
      {result && <NodeInfoPanel data={result} selectedIds={selectedIds} />}
      <WarningsPanel warnings={warnings} />
    </>
  ) : null;

  if (!result) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
        <h1 className="text-4xl font-bold tracking-tight">NeuroTrace3D</h1>
        <p className="text-text-muted text-lg">3D neuron morphology viewer</p>
        <div className="w-96">
          <FileUpload onFile={loadFile} filename={filename} loading={loading} />
        </div>
        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}
        <SampleLoader onLoad={loadFile} />
      </main>
    );
  }

  return (
    <ViewerContainer
      canvas={
        <NeuronCanvas
          data={result}
          hoveredId={hoveredId}
          selectedIds={selectedIds}
          focusTarget={focusTarget}
          onHover={handleHover}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          onFocusDone={handleFocusDone}
        />
      }
      panels={panels}
    />
  );
}

/** Helper to load bundled sample files */
function SampleLoader({ onLoad }: { onLoad: (file: File) => void }) {
  const samples = ["sample1.swc", "sample2.swc", "sample3.swc"];

  const handleClick = async (name: string) => {
    const res = await fetch(`/samples/${name}`);
    if (!res.ok) return;
    const text = await res.text();
    const file = new File([text], name, { type: "text/plain" });
    onLoad(file);
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
