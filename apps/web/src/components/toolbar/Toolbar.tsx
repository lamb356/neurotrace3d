"use client";

import { useNeuronStore } from "@/store/useNeuronStore";
import { exportSWC } from "@/lib/exportSWC";
import type { NeuronState } from "@/store/types";
import ThemeToggle from "@/components/ThemeToggle";

const TOOLS: { id: NeuronState["activeTool"]; label: string; shortcut: string }[] = [
  { id: "select", label: "Select", shortcut: "V" },
  { id: "move", label: "Move", shortcut: "M" },
  { id: "insert", label: "Insert", shortcut: "I" },
  { id: "delete", label: "Delete", shortcut: "X" },
  { id: "measure-distance", label: "Distance", shortcut: "D" },
  { id: "measure-angle", label: "Angle", shortcut: "A" },
  { id: "box-select", label: "Box", shortcut: "B" },
  { id: "path-select", label: "Path", shortcut: "P" },
  { id: "extend", label: "Extend", shortcut: "E" },
];

export default function Toolbar() {
  const activeTool = useNeuronStore((s) => s.activeTool);
  const setActiveTool = useNeuronStore((s) => s.setActiveTool);
  const historyLen = useNeuronStore((s) => s.history.length);
  const futureLen = useNeuronStore((s) => s.future.length);
  const nodeCount = useNeuronStore((s) => s.tree.size);
  const selectionCount = useNeuronStore((s) => s.selection.size);
  const measureCount = useNeuronStore((s) => s.measurements.length);

  const handleUndo = () => useNeuronStore.getState().undo();
  const handleRedo = () => useNeuronStore.getState().redo();
  const handleExport = () => exportSWC(useNeuronStore.getState());

  return (
    <div className="bg-surface border-border flex items-center gap-1 border-b px-3 py-1.5">
      {/* Tool buttons */}
      <div className="flex gap-1">
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
              activeTool === tool.id
                ? "bg-accent text-white"
                : "text-text-muted hover:bg-surface-hover hover:text-text"
            }`}
            onClick={() => setActiveTool(tool.id)}
            title={`${tool.label} (${tool.shortcut})`}
          >
            {tool.shortcut} {tool.label}
          </button>
        ))}
      </div>

      {measureCount > 0 && (
        <button
          className="text-text-muted hover:bg-surface-hover hover:text-text rounded px-2 py-1 text-xs transition-colors"
          onClick={() => useNeuronStore.getState().clearMeasurements()}
          title="Clear all measurements"
        >
          Clear ({measureCount})
        </button>
      )}

      <div className="bg-border mx-2 h-5 w-px" />

      {/* Undo / Redo */}
      <div className="flex gap-1">
        <button
          className="rounded px-2 py-1 text-xs transition-colors enabled:hover:bg-surface-hover disabled:opacity-30"
          onClick={handleUndo}
          disabled={historyLen === 0}
          title="Undo (Ctrl+Z)"
        >
          Undo
        </button>
        <button
          className="rounded px-2 py-1 text-xs transition-colors enabled:hover:bg-surface-hover disabled:opacity-30"
          onClick={handleRedo}
          disabled={futureLen === 0}
          title="Redo (Ctrl+Shift+Z)"
        >
          Redo
        </button>
      </div>

      <div className="bg-border mx-2 h-5 w-px" />

      {/* Export */}
      <button
        className="text-text-muted hover:bg-surface-hover hover:text-text rounded px-2 py-1 text-xs transition-colors"
        onClick={handleExport}
        title="Export edited SWC"
      >
        Export
      </button>

      {/* Screenshot */}
      <button
        className="text-text-muted hover:bg-surface-hover hover:text-text rounded px-2 py-1 text-xs transition-colors"
        onClick={() => window.dispatchEvent(new CustomEvent("take-screenshot"))}
        title="Save PNG screenshot"
      >
        Screenshot
      </button>

      <div className="bg-border mx-2 h-5 w-px" />

      {/* Theme Toggle */}
      <ThemeToggle />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Status */}
      <span className="text-text-muted text-xs">
        {nodeCount} nodes
        {selectionCount > 0 && (
          <span className="text-accent ml-2">{selectionCount} selected</span>
        )}
      </span>
    </div>
  );
}
