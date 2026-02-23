"use client";

import { useRef, useEffect } from "react";
import { SWC_TYPE } from "@neurotrace/swc-parser";
import { getTypeColor, getTypeLabel } from "@/lib/colors";
import { useNeuronStore } from "@/store/useNeuronStore";

interface RetypeDropdownProps {
  anchorX: number;
  anchorY: number;
  nodeIds: number[];
  onClose: () => void;
}

const TYPE_ENTRIES = Object.entries(SWC_TYPE).map(([name, code]) => ({
  name,
  code: code as number,
  label: getTypeLabel(code as number),
  color: getTypeColor(code as number),
}));

export default function RetypeDropdown({ anchorX, anchorY, nodeIds, onClose }: RetypeDropdownProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const handleRetype = (typeCode: number) => {
    useNeuronStore.getState().retypeNodes(nodeIds, typeCode);
    onClose();
  };

  return (
    <div
      ref={ref}
      className="bg-surface border-border fixed z-50 rounded-lg border py-1 shadow-lg"
      style={{ left: anchorX, top: anchorY }}
    >
      {TYPE_ENTRIES.map((entry) => (
        <button
          key={entry.code}
          className="hover:bg-surface-hover flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs"
          onClick={() => handleRetype(entry.code)}
        >
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          {entry.label}
        </button>
      ))}
    </div>
  );
}
