"use client";

import { useNeuronStore } from "@/store/useNeuronStore";
import { getTypeLabel, getTypeColor } from "@/lib/colors";
import { getBranchOrder, getPathToSoma } from "@/lib/morphometrics";

export default function StatusBar() {
  const tree = useNeuronStore((s) => s.tree);
  const childIndex = useNeuronStore((s) => s.childIndex);
  const selection = useNeuronStore((s) => s.selection);
  const hoveredId = useNeuronStore((s) => s.hovered);

  const nodeCount = tree.size;

  // Count edges (nodes with parentId !== -1)
  let segmentCount = 0;
  for (const [, node] of tree) {
    if (node.parentId !== -1) segmentCount++;
  }

  const hoveredNode = hoveredId !== null ? tree.get(hoveredId) : null;

  return (
    <div
      className="bg-surface border-border flex items-center gap-4 border-t px-3 text-xs"
      style={{ height: 24, minHeight: 24 }}
    >
      <span className="text-text-muted">
        Nodes: <span className="text-text numeric">{nodeCount}</span>
      </span>
      <span className="text-text-muted">
        Segments: <span className="text-text numeric">{segmentCount}</span>
      </span>
      {selection.size > 0 && (
        <span className="text-accent">
          Selected: <span className="numeric">{selection.size}</span>
        </span>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Hover info */}
      {hoveredNode && (
        <div className="flex items-center gap-3">
          <span className="text-text-muted">
            ID: <span className="text-text numeric">{hoveredNode.id}</span>
          </span>
          <span style={{ color: getTypeColor(hoveredNode.type) }}>
            {getTypeLabel(hoveredNode.type)}
          </span>
          <span className="text-text-muted">
            X:<span className="text-text numeric">{hoveredNode.x.toFixed(1)}</span>
            {" "}Y:<span className="text-text numeric">{hoveredNode.y.toFixed(1)}</span>
            {" "}Z:<span className="text-text numeric">{hoveredNode.z.toFixed(1)}</span>
          </span>
          <span className="text-text-muted">
            R:<span className="text-text numeric">{hoveredNode.radius.toFixed(2)}</span>
          </span>
          <span className="text-text-muted">
            BO:<span className="text-text numeric">{getBranchOrder(tree, childIndex, hoveredNode.id)}</span>
          </span>
          <span className="text-text-muted">
            Path:<span className="text-text numeric">{getPathToSoma(tree, hoveredNode.id).toFixed(1)}</span>µm
          </span>
        </div>
      )}
    </div>
  );
}
