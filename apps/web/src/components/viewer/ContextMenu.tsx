"use client";

import { useRef, useEffect, useState } from "react";
import { useNeuronStore } from "@/store/useNeuronStore";
import { getTypeLabel } from "@/lib/colors";
import RetypeDropdown from "@/components/toolbar/RetypeDropdown";

interface ContextMenuProps {
  nodeId: number;
  x: number;
  y: number;
  onClose: () => void;
}

export default function ContextMenu({ nodeId, x, y, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [retypeAnchor, setRetypeAnchor] = useState<{ x: number; y: number } | null>(null);

  const node = useNeuronStore((s) => s.tree.get(nodeId));

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", keyHandler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", keyHandler);
    };
  }, [onClose]);

  if (!node) return null;

  const handleDelete = () => {
    useNeuronStore.getState().deleteNodes([nodeId]);
    onClose();
  };

  const handleSelectSubtree = () => {
    useNeuronStore.getState().selectSubtree(nodeId);
    onClose();
  };

  const handleCenterCamera = () => {
    useNeuronStore.getState().setFocusTarget(nodeId);
    onClose();
  };

  const handleRetypeHover = (e: React.MouseEvent) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setRetypeAnchor({ x: rect.right + 2, y: rect.top });
  };

  return (
    <>
      <div
        ref={ref}
        className="bg-surface border-border fixed z-50 min-w-[180px] rounded-lg border py-1 shadow-lg"
        style={{ left: x, top: y }}
      >
        {/* Header */}
        <div className="border-border border-b px-3 py-1.5 text-xs font-medium">
          Node #{nodeId} ({getTypeLabel(node.type)})
        </div>

        {/* Retype */}
        <button
          className="hover:bg-surface-hover flex w-full items-center justify-between px-3 py-1.5 text-left text-xs"
          onMouseEnter={handleRetypeHover}
          onMouseLeave={() => setRetypeAnchor(null)}
        >
          Retype
          <span className="text-text-muted ml-4">&rsaquo;</span>
        </button>

        {/* Delete */}
        <button
          className="hover:bg-surface-hover w-full px-3 py-1.5 text-left text-xs text-red-400"
          onClick={handleDelete}
        >
          Delete
        </button>

        {/* Select subtree */}
        <button
          className="hover:bg-surface-hover w-full px-3 py-1.5 text-left text-xs"
          onClick={handleSelectSubtree}
        >
          Select subtree
        </button>

        {/* Center camera */}
        <button
          className="hover:bg-surface-hover w-full px-3 py-1.5 text-left text-xs"
          onClick={handleCenterCamera}
        >
          Center camera
        </button>
      </div>

      {retypeAnchor && (
        <RetypeDropdown
          anchorX={retypeAnchor.x}
          anchorY={retypeAnchor.y}
          nodeIds={[nodeId]}
          onClose={onClose}
        />
      )}
    </>
  );
}
