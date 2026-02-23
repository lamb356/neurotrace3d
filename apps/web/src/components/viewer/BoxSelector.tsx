"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import { useNeuronStore } from "@/store/useNeuronStore";

/** Minimum drag distance in pixels before box selection activates */
const DRAG_THRESHOLD = 5;

interface DragState {
  startX: number;
  startY: number;
  shiftKey: boolean;
}

/**
 * Box selection tool: drag a rectangle to select all nodes whose screen-space
 * projections fall inside the box. Follows NodeDragger pattern — behavior-only
 * R3F component that attaches native pointer events to gl.domElement.
 */
export default function BoxSelector() {
  const { camera, gl, size, controls, invalidate } = useThree();
  const dragRef = useRef<DragState | null>(null);
  const [rect, setRect] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const activeRef = useRef(false); // true once drag exceeds threshold

  const onPointerDown = useCallback(
    (e: PointerEvent) => {
      if (e.button !== 0) return;
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        shiftKey: e.shiftKey,
      };
      activeRef.current = false;
    },
    [],
  );

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;

      if (!activeRef.current) {
        if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
        // Activate — disable orbit controls
        activeRef.current = true;
        if (controls) (controls as unknown as { enabled: boolean }).enabled = false;
        gl.domElement.setPointerCapture(e.pointerId);
      }

      setRect({
        x1: dragRef.current.startX,
        y1: dragRef.current.startY,
        x2: e.clientX,
        y2: e.clientY,
      });
    },
    [controls, gl],
  );

  const onPointerUp = useCallback(
    (e: PointerEvent) => {
      if (!dragRef.current) return;

      const wasActive = activeRef.current;
      const shiftKey = dragRef.current.shiftKey;

      // Re-enable orbit controls
      if (controls) (controls as unknown as { enabled: boolean }).enabled = true;
      gl.domElement.releasePointerCapture(e.pointerId);
      dragRef.current = null;
      activeRef.current = false;
      setRect(null);

      if (!wasActive) return; // Sub-threshold: let NeuronRenderer handle click

      // Compute screen-space bounds of the drag rectangle
      const canvasRect = gl.domElement.getBoundingClientRect();
      const x1 = rect?.x1 ?? 0;
      const y1 = rect?.y1 ?? 0;
      const x2 = e.clientX;
      const y2 = e.clientY;

      const minX = Math.min(x1, x2);
      const maxX = Math.max(x1, x2);
      const minY = Math.min(y1, y2);
      const maxY = Math.max(y1, y2);

      // Project all nodes to screen space and test containment
      const store = useNeuronStore.getState();
      const tree = store.tree;
      const selected: number[] = [];
      const v = new Vector3();

      for (const [id, node] of tree) {
        v.set(node.x, node.y, node.z);
        v.project(camera);

        // NDC → screen pixels
        const sx = ((v.x + 1) / 2) * canvasRect.width + canvasRect.left;
        const sy = ((-v.y + 1) / 2) * canvasRect.height + canvasRect.top;

        // Only include nodes in front of camera (z in NDC is -1 to 1)
        if (v.z > 1) continue;

        if (sx >= minX && sx <= maxX && sy >= minY && sy <= maxY) {
          selected.push(id);
        }
      }

      if (selected.length === 0) {
        if (!shiftKey) store.clearSelection();
        return;
      }

      if (shiftKey) {
        for (const id of selected) store.addToSelection(id);
      } else {
        // Replace selection: select first, then add rest
        store.selectNode(selected[0]);
        for (let i = 1; i < selected.length; i++) {
          store.addToSelection(selected[i]);
        }
      }

      invalidate();
    },
    [camera, gl, controls, rect, size, invalidate],
  );

  useEffect(() => {
    const canvas = gl.domElement;
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      // Ensure orbit controls are re-enabled on unmount
      if (controls) (controls as unknown as { enabled: boolean }).enabled = true;
    };
  }, [gl, onPointerDown, onPointerMove, onPointerUp, controls]);

  return (
    <>
      {rect && <BoxOverlay x1={rect.x1} y1={rect.y1} x2={rect.x2} y2={rect.y2} />}
    </>
  );
}

function BoxOverlay({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  const left = Math.min(x1, x2);
  const top = Math.min(y1, y2);
  const width = Math.abs(x2 - x1);
  const height = Math.abs(y2 - y1);

  return createPortal(
    <div
      style={{
        position: "fixed",
        left,
        top,
        width,
        height,
        border: "1.5px dashed rgba(96, 165, 250, 0.8)",
        backgroundColor: "rgba(96, 165, 250, 0.1)",
        pointerEvents: "none",
        zIndex: 9999,
      }}
    />,
    document.body,
  );
}
