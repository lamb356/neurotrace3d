import type { SWCParseResult, MorphologyStats } from "./types.js";

/**
 * Compute morphology statistics from a parsed SWC result.
 *
 * Uses iterative DFS for maxPathDistance and maxBranchOrder
 * to avoid stack overflow on deep neurons.
 */
export function computeStats(result: SWCParseResult): MorphologyStats {
  const { nodes, roots, childIndex } = result;

  const nodeCountByType = new Map<number, number>();
  let totalLength = 0;
  let branchPoints = 0;
  let terminalTips = 0;

  // Per-node counts
  for (const [id, node] of nodes) {
    // Type histogram
    nodeCountByType.set(node.type, (nodeCountByType.get(node.type) ?? 0) + 1);

    // Edge length to parent
    if (node.parentId !== -1) {
      const parent = nodes.get(node.parentId);
      if (parent) {
        const dx = node.x - parent.x;
        const dy = node.y - parent.y;
        const dz = node.z - parent.z;
        totalLength += Math.sqrt(dx * dx + dy * dy + dz * dz);
      }
    }

    // Branch points and tips
    const children = childIndex.get(id) ?? [];
    if (children.length >= 2) {
      branchPoints++;
    }
    if (children.length === 0) {
      terminalTips++;
    }
  }

  // Iterative DFS for maxPathDistance and maxBranchOrder
  let maxPathDistance = 0;
  let maxBranchOrder = 0;

  interface StackFrame {
    id: number;
    cumulativeDistance: number;
    branchOrder: number;
  }

  for (const rootId of roots) {
    const stack: StackFrame[] = [
      { id: rootId, cumulativeDistance: 0, branchOrder: 0 },
    ];
    const visited = new Set<number>();

    while (stack.length > 0) {
      const frame = stack.pop()!;
      if (visited.has(frame.id)) continue;
      visited.add(frame.id);

      const node = nodes.get(frame.id);
      if (!node) continue;

      // Compute distance from this node to its parent
      let edgeLen = 0;
      if (node.parentId !== -1) {
        const parent = nodes.get(node.parentId);
        if (parent) {
          const dx = node.x - parent.x;
          const dy = node.y - parent.y;
          const dz = node.z - parent.z;
          edgeLen = Math.sqrt(dx * dx + dy * dy + dz * dz);
        }
      }

      const dist = frame.cumulativeDistance + edgeLen;
      if (dist > maxPathDistance) maxPathDistance = dist;

      const order = frame.branchOrder;
      if (order > maxBranchOrder) maxBranchOrder = order;

      const children = childIndex.get(frame.id) ?? [];
      const isBranch = children.length >= 2;

      for (const childId of children) {
        if (!visited.has(childId)) {
          stack.push({
            id: childId,
            cumulativeDistance: dist,
            branchOrder: isBranch ? order + 1 : order,
          });
        }
      }
    }
  }

  return {
    totalNodes: nodes.size,
    totalLength,
    branchPoints,
    terminalTips,
    maxPathDistance,
    maxBranchOrder,
    nodeCountByType,
    rootCount: roots.length,
  };
}
