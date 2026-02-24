"use client";

import { useState } from "react";
import { useImageStore } from "@/store/useImageStore";

export default function ImageControlsPanel() {
  const sliceCount = useImageStore((s) => s.sliceCount);
  const fileName = useImageStore((s) => s.fileName);
  const currentZ = useImageStore((s) => s.currentZ);
  const visible = useImageStore((s) => s.visible);
  const opacity = useImageStore((s) => s.opacity);
  const brightness = useImageStore((s) => s.brightness);
  const contrast = useImageStore((s) => s.contrast);
  const scaleVal = useImageStore((s) => s.scale);
  const plane = useImageStore((s) => s.plane);
  const offsetX = useImageStore((s) => s.offsetX);
  const offsetY = useImageStore((s) => s.offsetY);
  const offsetZ = useImageStore((s) => s.offsetZ);
  const width = useImageStore((s) => s.width);
  const height = useImageStore((s) => s.height);
  const bitDepth = useImageStore((s) => s.bitDepth);
  const physicalPixelSize = useImageStore((s) => s.physicalPixelSize);
  const loading = useImageStore((s) => s.loading);

  const [collapsed, setCollapsed] = useState(false);

  if (sliceCount === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <button
        className="flex w-full items-center gap-1.5 text-left"
        onClick={() => setCollapsed((c) => !c)}
      >
        <svg
          className="h-3 w-3 transition-transform duration-200"
          style={{ transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)" }}
          viewBox="0 0 12 12"
          fill="currentColor"
        >
          <path d="M3 2l6 4-6 4z" />
        </svg>
        <h3 className="text-sm font-semibold uppercase tracking-wider">
          Image Overlay
        </h3>
      </button>

      {!collapsed && (
        <>
          {/* File info */}
          <div className="text-xs">
            <p className="text-text-muted truncate" title={fileName ?? ""}>
              {fileName}
            </p>
            <p className="text-text-muted">
              {width} x {height} &middot; {sliceCount} slices &middot; {bitDepth}-bit
            </p>
            {physicalPixelSize && (
              <p className="text-text-muted">
                Pixel: {physicalPixelSize.x.toFixed(3)} x {physicalPixelSize.y.toFixed(3)} &micro;m
                &middot; Z: {physicalPixelSize.z.toFixed(3)} &micro;m
              </p>
            )}
          </div>

          {/* Visibility */}
          <label className="text-text-muted flex items-center gap-1 text-xs">
            <input
              type="checkbox"
              checked={visible}
              onChange={(e) => useImageStore.getState().setVisible(e.target.checked)}
              className="accent-accent"
            />
            Visible
          </label>

          {/* Z Slice */}
          <div className="flex flex-col gap-1">
            <label className="text-text-muted text-xs">
              Z Slice: {currentZ + 1} / {sliceCount}
              {loading && " (loading...)"}
            </label>
            <input
              type="range"
              min={0}
              max={sliceCount - 1}
              value={currentZ}
              onChange={(e) => useImageStore.getState().setCurrentZ(Number(e.target.value))}
              className="accent-accent w-full"
            />
          </div>

          {/* Opacity */}
          <div className="flex flex-col gap-1">
            <label className="text-text-muted text-xs">
              Opacity: {Math.round(opacity * 100)}%
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(opacity * 100)}
              onChange={(e) => useImageStore.getState().setOpacity(Number(e.target.value) / 100)}
              className="accent-accent w-full"
            />
          </div>

          {/* Brightness */}
          <div className="flex flex-col gap-1">
            <label className="text-text-muted text-xs">
              Brightness: {Math.round(brightness * 100)}
            </label>
            <input
              type="range"
              min={-100}
              max={100}
              value={Math.round(brightness * 100)}
              onChange={(e) => useImageStore.getState().setBrightness(Number(e.target.value) / 100)}
              className="accent-accent w-full"
            />
          </div>

          {/* Contrast */}
          <div className="flex flex-col gap-1">
            <label className="text-text-muted text-xs">
              Contrast: {contrast.toFixed(1)}x
            </label>
            <input
              type="range"
              min={0}
              max={300}
              value={Math.round(contrast * 100)}
              onChange={(e) => useImageStore.getState().setContrast(Number(e.target.value) / 100)}
              className="accent-accent w-full"
            />
          </div>

          {/* Scale */}
          <label className="text-text-muted flex items-center gap-1 text-xs">
            Scale:
            <input
              type="number"
              min={0.001}
              step={0.1}
              value={scaleVal}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v > 0) useImageStore.getState().setScale(v);
              }}
              className="bg-bg border-border w-16 rounded border px-1.5 py-0.5 text-xs"
            />
            <span>&micro;m/px</span>
          </label>

          {/* Plane */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-text-muted">Plane:</span>
            {(["xy", "xz", "yz"] as const).map((p) => (
              <label key={p} className="flex items-center gap-0.5">
                <input
                  type="radio"
                  name="image-plane"
                  checked={plane === p}
                  onChange={() => useImageStore.getState().setPlane(p)}
                  className="accent-accent"
                />
                {p.toUpperCase()}
              </label>
            ))}
          </div>

          {/* Offsets */}
          <div className="grid grid-cols-3 gap-1 text-xs">
            {([
              ["X", offsetX, 0] as const,
              ["Y", offsetY, 1] as const,
              ["Z", offsetZ, 2] as const,
            ]).map(([label, value, idx]) => (
              <label key={label} className="text-text-muted flex flex-col gap-0.5">
                Offset {label}
                <input
                  type="number"
                  step={1}
                  value={value}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    const vals = [offsetX, offsetY, offsetZ];
                    vals[idx] = v;
                    useImageStore.getState().setOffset(vals[0], vals[1], vals[2]);
                  }}
                  className="bg-bg border-border w-full rounded border px-1.5 py-0.5 text-xs"
                />
              </label>
            ))}
          </div>

          {/* Clear */}
          <button
            className="border-border bg-surface hover:bg-surface-hover rounded border px-3 py-1.5 text-xs transition-colors"
            onClick={() => useImageStore.getState().clear()}
          >
            Remove Image
          </button>
        </>
      )}
    </div>
  );
}
