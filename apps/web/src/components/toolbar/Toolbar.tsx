"use client";

import { useNeuronStore } from "@/store/useNeuronStore";
import { exportSWC } from "@/lib/exportSWC";
import { exportToSVG, downloadSVG } from "@/lib/svgExport";
import { mainCameraRef } from "@/lib/mainCameraRef";
import type { NeuronState } from "@/store/types";
import ThemeToggle from "@/components/ThemeToggle";

const CAMERA_MODES: { id: NeuronState["cameraMode"]; label: string; icon: string; shortcut: string }[] = [
  { id: "perspective", label: "3D Perspective", icon: "3D", shortcut: "1" },
  { id: "ortho-xy", label: "XY Ortho", icon: "XY", shortcut: "2" },
  { id: "ortho-xz", label: "XZ Ortho", icon: "XZ", shortcut: "3" },
  { id: "ortho-yz", label: "YZ Ortho", icon: "YZ", shortcut: "4" },
];

const TOOLS: { id: NeuronState["activeTool"]; label: string; icon: string; shortcut: string }[] = [
  { id: "select", label: "Select", icon: "V", shortcut: "V" },
  { id: "move", label: "Move", icon: "M", shortcut: "M" },
  { id: "insert", label: "Insert", icon: "I", shortcut: "I" },
  { id: "delete", label: "Delete", icon: "X", shortcut: "X" },
  { id: "measure-distance", label: "Distance", icon: "D", shortcut: "D" },
  { id: "measure-angle", label: "Angle", icon: "A", shortcut: "A" },
  { id: "box-select", label: "Box Select", icon: "B", shortcut: "B" },
  { id: "path-select", label: "Path Select", icon: "P", shortcut: "P" },
  { id: "extend", label: "Extend", icon: "E", shortcut: "E" },
];

function ToolButton({
  icon,
  label,
  shortcut,
  active,
  disabled,
  onClick,
}: {
  icon: string;
  label: string;
  shortcut?: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`group relative flex h-9 w-9 items-center justify-center rounded text-xs font-bold transition-colors ${
        active
          ? "bg-accent text-white"
          : disabled
            ? "text-text-muted opacity-30"
            : "text-text-muted hover:bg-surface-hover hover:text-text"
      }`}
      onClick={onClick}
      disabled={disabled}
      title={`${label}${shortcut ? ` (${shortcut})` : ""}`}
    >
      {icon}
      {/* Tooltip */}
      <span className="pointer-events-none absolute left-full ml-2 hidden whitespace-nowrap rounded bg-surface border border-border px-2 py-1 text-xs text-text shadow-lg group-hover:block z-50">
        {label}{shortcut ? ` (${shortcut})` : ""}
      </span>
    </button>
  );
}

function Divider() {
  return <div className="bg-border mx-auto my-1 h-px w-6" />;
}

export default function Toolbar() {
  const activeTool = useNeuronStore((s) => s.activeTool);
  const setActiveTool = useNeuronStore((s) => s.setActiveTool);
  const historyLen = useNeuronStore((s) => s.history.length);
  const futureLen = useNeuronStore((s) => s.future.length);
  const measureCount = useNeuronStore((s) => s.measurements.length);
  const cameraMode = useNeuronStore((s) => s.cameraMode);
  const showMinimap = useNeuronStore((s) => s.showMinimap);
  const postProcessing = useNeuronStore((s) => s.postProcessing);

  const handleUndo = () => useNeuronStore.getState().undo();
  const handleRedo = () => useNeuronStore.getState().redo();
  const handleExport = () => exportSWC(useNeuronStore.getState());

  return (
    <div className="bg-surface border-border flex w-12 flex-col items-center gap-0.5 border-r py-2">
      {/* Tool buttons */}
      {TOOLS.map((tool) => (
        <ToolButton
          key={tool.id}
          icon={tool.icon}
          label={tool.label}
          shortcut={tool.shortcut}
          active={activeTool === tool.id}
          onClick={() => setActiveTool(tool.id)}
        />
      ))}

      {measureCount > 0 && (
        <ToolButton
          icon="C"
          label={`Clear Measurements (${measureCount})`}
          onClick={() => useNeuronStore.getState().clearMeasurements()}
        />
      )}

      <Divider />

      {/* Undo / Redo */}
      <ToolButton
        icon="↶"
        label="Undo"
        shortcut="Ctrl+Z"
        disabled={historyLen === 0}
        onClick={handleUndo}
      />
      <ToolButton
        icon="↷"
        label="Redo"
        shortcut="Ctrl+Shift+Z"
        disabled={futureLen === 0}
        onClick={handleRedo}
      />

      <Divider />

      {/* Export + Screenshot + Batch */}
      <ToolButton icon="↗" label="Export SWC" onClick={handleExport} />
      <ToolButton
        icon="BA"
        label="Batch Analysis"
        onClick={() => window.open("/batch", "_blank")}
      />
      <ToolButton
        icon="📷"
        label="Screenshot"
        onClick={() => window.dispatchEvent(new CustomEvent("take-screenshot"))}
      />
      <ToolButton
        icon="SV"
        label="Export SVG"
        onClick={() => {
          const cam = mainCameraRef.current;
          if (!cam) return;
          const { tree, childIndex, fileName } = useNeuronStore.getState();
          if (tree.size === 0) return;
          const svg = exportToSVG(tree, childIndex, cam);
          const baseName = (fileName ?? "neuron").replace(/\.swc$/i, "");
          downloadSVG(svg, `neurotrace3d-${baseName}.svg`);
        }}
      />
      <ToolButton
        icon="VD"
        label="Video Export"
        onClick={() => window.dispatchEvent(new CustomEvent("open-video-modal"))}
      />
      <ToolButton
        icon="PB"
        label="Publication Export"
        onClick={() => window.dispatchEvent(new CustomEvent("open-publication-modal"))}
      />

      <Divider />

      {/* Minimap toggle */}
      <ToolButton
        icon="▣"
        label="Toggle Minimap"
        active={showMinimap}
        onClick={() => useNeuronStore.getState().setShowMinimap(!showMinimap)}
      />

      {/* Post-processing quality */}
      <ToolButton
        icon="FX"
        label={`FX: ${postProcessing === "off" ? "Off" : postProcessing === "low" ? "Low" : "High"} (click to cycle)`}
        active={postProcessing !== "off"}
        onClick={() => {
          const next = postProcessing === "off" ? "low" : postProcessing === "low" ? "high" : "off";
          useNeuronStore.getState().setPostProcessing(next);
        }}
      />

      <Divider />

      {/* Camera mode buttons */}
      {CAMERA_MODES.map((mode) => (
        <ToolButton
          key={mode.id}
          icon={mode.icon}
          label={mode.label}
          shortcut={mode.shortcut}
          active={cameraMode === mode.id}
          onClick={() => useNeuronStore.getState().setCameraMode(mode.id)}
        />
      ))}

      <Divider />

      {/* Theme Toggle */}
      <div className="flex items-center justify-center">
        <ThemeToggle />
      </div>
    </div>
  );
}
