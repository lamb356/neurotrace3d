"use client";

import { useState, useCallback } from "react";
import { Vector3 } from "three";
import type { SWCParseResult } from "@neurotrace/swc-parser";

export function useNeuronSelection(data: SWCParseResult | null) {
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [focusTarget, setFocusTarget] = useState<Vector3 | null>(null);

  const handleHover = useCallback((id: number | null) => {
    setHoveredId(id);
  }, []);

  const handleClick = useCallback((id: number, shiftKey: boolean) => {
    setSelectedIds((prev) => {
      if (shiftKey) {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      }
      return new Set([id]);
    });
  }, []);

  const handleDoubleClick = useCallback(
    (id: number) => {
      if (!data) return;
      const node = data.nodes.get(id);
      if (node) {
        setFocusTarget(new Vector3(node.x, node.y, node.z));
      }
    },
    [data],
  );

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleFocusDone = useCallback(() => {
    setFocusTarget(null);
  }, []);

  return {
    hoveredId,
    selectedIds,
    focusTarget,
    handleHover,
    handleClick,
    handleDoubleClick,
    clearSelection,
    handleFocusDone,
  };
}
