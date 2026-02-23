"use client";

import { useMemo, useState } from "react";
import { useNeuronStore } from "@/store/useNeuronStore";
import { getTypeColor, getTypeLabel } from "@/lib/colors";
import type { SWCNode } from "@neurotrace/swc-parser";

interface ComputedStats {
  totalNodes: number;
  totalLength: number;
  branchPoints: number;
  terminalTips: number;
  maxDepth: number;
  typeCounts: Map<number, number>;
}

function computeStatsFromTree(
  tree: Map<number, SWCNode>,
  childIndex: Map<number, number[]>,
  roots: number[],
): ComputedStats {
  let totalLength = 0;
  let branchPoints = 0;
  let terminalTips = 0;
  const typeCounts = new Map<number, number>();

  for (const [id, node] of tree) {
    // Total length: sum Euclidean distances to parent
    if (node.parentId !== -1) {
      const parent = tree.get(node.parentId);
      if (parent) {
        const dx = node.x - parent.x;
        const dy = node.y - parent.y;
        const dz = node.z - parent.z;
        totalLength += Math.sqrt(dx * dx + dy * dy + dz * dz);
      }
    }

    // Branch points: nodes with 2+ children
    const children = childIndex.get(id);
    if (children && children.length >= 2) {
      branchPoints++;
    }

    // Terminal tips: leaf nodes (0 children)
    if (!children || children.length === 0) {
      terminalTips++;
    }

    // Per-type counts
    typeCounts.set(node.type, (typeCounts.get(node.type) ?? 0) + 1);
  }

  // Max depth: BFS from roots
  let maxDepth = 0;
  const queue: Array<{ id: number; depth: number }> = roots.map((id) => ({ id, depth: 0 }));
  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;
    if (depth > maxDepth) maxDepth = depth;
    const children = childIndex.get(id);
    if (children) {
      for (const child of children) {
        queue.push({ id: child, depth: depth + 1 });
      }
    }
  }

  return {
    totalNodes: tree.size,
    totalLength,
    branchPoints,
    terminalTips,
    maxDepth,
    typeCounts,
  };
}

export default function StatsPanel() {
  const tree = useNeuronStore((s) => s.tree);
  const childIndex = useNeuronStore((s) => s.childIndex);
  const roots = useNeuronStore((s) => s.roots);
  const [collapsed, setCollapsed] = useState(false);

  const stats = useMemo(
    () => (tree.size > 0 ? computeStatsFromTree(tree, childIndex, roots) : null),
    [tree, childIndex, roots],
  );

  if (!stats) {
    return (
      <div className="flex flex-col gap-2">
        <h3 className="text-text-muted text-sm font-semibold uppercase tracking-wider">
          Statistics
        </h3>
        <p className="text-text-muted text-xs">No neuron loaded</p>
      </div>
    );
  }

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
        <h3 className="text-sm font-semibold uppercase tracking-wider">Statistics</h3>
      </button>

      {!collapsed && (
        <>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Stat label="Total Nodes" value={stats.totalNodes} />
            <Stat label="Total Length" value={`${stats.totalLength.toFixed(1)} \u00b5m`} />
            <Stat label="Branch Points" value={stats.branchPoints} />
            <Stat label="Terminal Tips" value={stats.terminalTips} />
            <Stat label="Max Depth" value={stats.maxDepth} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Array.from(stats.typeCounts.entries()).map(([type, count]) => (
              <span
                key={type}
                className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                style={{
                  backgroundColor: getTypeColor(type) + "22",
                  color: getTypeColor(type),
                  border: `1px solid ${getTypeColor(type)}44`,
                }}
              >
                {getTypeLabel(type)}: {count}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-text-muted text-xs">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
