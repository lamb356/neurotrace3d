"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useNeuronStore } from "@/store/useNeuronStore";
import { mainCameraRef } from "@/lib/mainCameraRef";
import type { OrthographicCamera } from "three";

const SNAP_VALUES = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
const MIN_BAR_PX = 30;
const MAX_BAR_PX = 200;

export default function ScaleBar() {
  const cameraMode = useNeuronStore((s) => s.cameraMode);
  const hasNodes = useNeuronStore((s) => s.tree.size > 0);
  const [scaleInfo, setScaleInfo] = useState<{ widthPx: number; label: string } | null>(null);
  const rafRef = useRef<number>(0);

  const update = useCallback(() => {
    const cam = mainCameraRef.current;
    if (!cam || !("isOrthographicCamera" in cam) || !(cam as OrthographicCamera).isOrthographicCamera) {
      setScaleInfo(null);
      return;
    }
    const orthoCam = cam as OrthographicCamera;

    // World units visible across the viewport width
    const viewWidth = orthoCam.right - orthoCam.left;
    const zoom = orthoCam.zoom;
    const worldWidth = viewWidth / zoom;

    // Viewport pixel width (use canvas parent element)
    const el = document.querySelector("canvas");
    if (!el) return;
    const viewportPx = el.clientWidth;

    // Pixels per world unit
    const pxPerUnit = viewportPx / worldWidth;

    // Find best snap value
    let bestSnap = SNAP_VALUES[0];
    for (const v of SNAP_VALUES) {
      const barPx = v * pxPerUnit;
      if (barPx >= MIN_BAR_PX && barPx <= MAX_BAR_PX) {
        bestSnap = v;
        break;
      }
    }

    const widthPx = bestSnap * pxPerUnit;
    if (widthPx < MIN_BAR_PX || widthPx > MAX_BAR_PX) {
      setScaleInfo(null);
      return;
    }

    setScaleInfo({
      widthPx,
      label: `${bestSnap} µm`,
    });
  }, []);

  useEffect(() => {
    if (cameraMode === "perspective" || !hasNodes) {
      setScaleInfo(null);
      return;
    }

    const handler = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(update);
    };

    // Listen for camera changes
    window.addEventListener("main-camera-moved", handler);
    // Initial calculation
    update();

    return () => {
      window.removeEventListener("main-camera-moved", handler);
      cancelAnimationFrame(rafRef.current);
    };
  }, [cameraMode, hasNodes, update]);

  if (!scaleInfo) return null;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 40,
        right: 16,
        pointerEvents: "none",
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
      }}
    >
      {/* Bar with end ticks */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          width: scaleInfo.widthPx,
        }}
      >
        {/* Left tick */}
        <div style={{ width: 1, height: 6, background: "rgba(255,255,255,0.7)" }} />
        {/* Horizontal bar */}
        <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.7)" }} />
        {/* Right tick */}
        <div style={{ width: 1, height: 6, background: "rgba(255,255,255,0.7)" }} />
      </div>
      {/* Label */}
      <span
        className="numeric"
        style={{
          fontSize: 10,
          color: "rgba(255,255,255,0.7)",
          letterSpacing: "0.02em",
        }}
      >
        {scaleInfo.label}
      </span>
    </div>
  );
}
