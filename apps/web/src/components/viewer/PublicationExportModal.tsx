"use client";

import { useState, useEffect, useCallback } from "react";
import Modal from "@/components/ui/Modal";
import { useNeuronStore } from "@/store/useNeuronStore";
import {
  JOURNAL_PRESETS,
  DEFAULT_PUB_CONFIG,
} from "@/lib/publicationExport";
import type { JournalPreset, LayoutMode, PublicationExportConfig } from "@/lib/publicationExport";

interface PublicationExportModalProps {
  open: boolean;
  onClose: () => void;
}

export default function PublicationExportModal({ open, onClose }: PublicationExportModalProps) {
  const [preset, setPreset] = useState<JournalPreset>(DEFAULT_PUB_CONFIG.preset);
  const [width, setWidth] = useState(DEFAULT_PUB_CONFIG.width);
  const [height, setHeight] = useState(DEFAULT_PUB_CONFIG.height);
  const [layout, setLayout] = useState<LayoutMode>(DEFAULT_PUB_CONFIG.layout);
  const [showScaleBar, setShowScaleBar] = useState(DEFAULT_PUB_CONFIG.showScaleBar);
  const [showLegend, setShowLegend] = useState(DEFAULT_PUB_CONFIG.showLegend);
  const [showFileName, setShowFileName] = useState(DEFAULT_PUB_CONFIG.showFileName);
  const [exporting, setExporting] = useState(false);

  // Sync preset → width/height
  function handlePresetChange(newPreset: JournalPreset) {
    setPreset(newPreset);
    if (newPreset !== "custom") {
      const p = JOURNAL_PRESETS[newPreset];
      setWidth(p.width);
      setHeight(p.height);
    }
  }

  const handleComplete = useCallback(
    (e: Event) => {
      const { blob } = (e as CustomEvent).detail as { blob: Blob };
      setExporting(false);

      const fileName = useNeuronStore.getState().fileName ?? "neuron";
      const baseName = fileName.replace(/\.swc$/i, "");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `neurotrace3d-${baseName}-pub.png`;
      a.click();
      URL.revokeObjectURL(url);
    },
    [],
  );

  useEffect(() => {
    window.addEventListener("publication-export-complete", handleComplete);
    return () => window.removeEventListener("publication-export-complete", handleComplete);
  }, [handleComplete]);

  function handleExport() {
    setExporting(true);

    const config: PublicationExportConfig = {
      preset,
      width,
      height,
      layout,
      showScaleBar,
      showLegend,
      showFileName,
    };

    // Wait a tick then dispatch
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("start-publication-export", { detail: config }));
    }, 50);
  }

  return (
    <Modal open={open} onClose={exporting ? () => {} : onClose} title="Publication Export" width="max-w-sm">
      <div className="flex flex-col gap-3">
        {/* Preset */}
        <label className="text-text-muted text-xs font-medium">
          Journal Preset
          <select
            className="bg-surface border-border text-text mt-1 block w-full rounded border px-2 py-1.5 text-sm"
            value={preset}
            onChange={(e) => handlePresetChange(e.target.value as JournalPreset)}
            disabled={exporting}
          >
            {Object.entries(JOURNAL_PRESETS).map(([key, val]) => (
              <option key={key} value={key}>
                {val.label} ({val.width} x {val.height})
              </option>
            ))}
          </select>
        </label>

        {/* Custom dimensions */}
        {preset === "custom" && (
          <div className="flex gap-2">
            <label className="text-text-muted flex-1 text-xs font-medium">
              Width
              <input
                type="number"
                min={200}
                max={8000}
                value={width}
                onChange={(e) => setWidth(Number(e.target.value))}
                className="bg-surface border-border text-text mt-1 block w-full rounded border px-2 py-1.5 text-sm"
                disabled={exporting}
              />
            </label>
            <label className="text-text-muted flex-1 text-xs font-medium">
              Height
              <input
                type="number"
                min={200}
                max={8000}
                value={height}
                onChange={(e) => setHeight(Number(e.target.value))}
                className="bg-surface border-border text-text mt-1 block w-full rounded border px-2 py-1.5 text-sm"
                disabled={exporting}
              />
            </label>
          </div>
        )}

        {/* Layout */}
        <label className="text-text-muted text-xs font-medium">
          Layout
          <select
            className="bg-surface border-border text-text mt-1 block w-full rounded border px-2 py-1.5 text-sm"
            value={layout}
            onChange={(e) => setLayout(e.target.value as LayoutMode)}
            disabled={exporting}
          >
            <option value="3d-only">3D View Only</option>
            <option value="3d-dendrogram">3D + Dendrogram</option>
            <option value="3d-sholl">3D + Sholl Analysis</option>
          </select>
        </label>

        {/* Overlay options */}
        <div className="flex flex-col gap-1.5">
          <span className="text-text-muted text-xs font-medium">Overlays</span>
          <CheckboxRow label="Type legend" checked={showLegend} onChange={setShowLegend} disabled={exporting} />
          <CheckboxRow label="Neuron name" checked={showFileName} onChange={setShowFileName} disabled={exporting} />
          <CheckboxRow label="Scale bar (ortho only)" checked={showScaleBar} onChange={setShowScaleBar} disabled={exporting} />
        </div>

        {/* Output info */}
        <div className="text-text-muted text-xs">
          Output: {width} x {height} px (300 DPI ≈ {(width / 300).toFixed(1)}" x {(height / 300).toFixed(1)}")
        </div>

        {/* Export button */}
        <button
          className="bg-accent mt-1 w-full rounded px-3 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
          onClick={handleExport}
          disabled={exporting}
        >
          {exporting ? "Exporting..." : "Export PNG"}
        </button>
      </div>
    </Modal>
  );
}

function CheckboxRow({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="text-text flex items-center gap-2 text-xs">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="accent-accent"
      />
      {label}
    </label>
  );
}
