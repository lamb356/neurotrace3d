import type { SWCNode } from "@neurotrace/swc-parser";

export interface DendroNode {
  id: number;
  x: number; // path distance from soma (µm)
  y: number; // leaf order (DFS index)
  type: number; // SWC type code
  parentId: number;
  isLeaf: boolean;
  isBranch: boolean;
}

/**
 * Compute dendrogram layout from an SWC tree.
 *
 * Pass 1 (DFS): cumulative Euclidean distance from root → x coordinate.
 * Pass 2 (DFS leaf ordering): leaves get y = leafIndex++,
 *   branch nodes get y = midpoint of child Y range.
 */
export function computeDendrogramLayout(
  tree: Map<number, SWCNode>,
  childIndex: Map<number, number[]>,
  rootId: number,
): Map<number, DendroNode> {
  const result = new Map<number, DendroNode>();
  if (!tree.has(rootId)) return result;

  // Pass 1: compute cumulative distance (x) via iterative DFS
  const distFromRoot = new Map<number, number>();
  distFromRoot.set(rootId, 0);

  const stack1: number[] = [rootId];
  // DFS order for pass 2 (will process in reverse for bottom-up)
  const dfsOrder: number[] = [];

  while (stack1.length > 0) {
    const id = stack1.pop()!;
    dfsOrder.push(id);
    const node = tree.get(id)!;
    const parentDist = distFromRoot.get(id)!;
    const children = childIndex.get(id) ?? [];

    for (const childId of children) {
      const child = tree.get(childId);
      if (!child) continue;
      const dx = child.x - node.x;
      const dy = child.y - node.y;
      const dz = child.z - node.z;
      const edgeLen = Math.sqrt(dx * dx + dy * dy + dz * dz);
      distFromRoot.set(childId, parentDist + edgeLen);
      stack1.push(childId);
    }
  }

  // Pass 2: assign y coordinates — leaves get sequential indices,
  // internal nodes get midpoint of their children's y range.
  // Process bottom-up (reverse DFS order).
  let leafIndex = 0;
  const yMin = new Map<number, number>();
  const yMax = new Map<number, number>();
  const yVal = new Map<number, number>();

  for (let i = dfsOrder.length - 1; i >= 0; i--) {
    const id = dfsOrder[i];
    const children = childIndex.get(id) ?? [];
    const isLeaf = children.length === 0;

    if (isLeaf) {
      yVal.set(id, leafIndex);
      yMin.set(id, leafIndex);
      yMax.set(id, leafIndex);
      leafIndex++;
    } else {
      let lo = Infinity;
      let hi = -Infinity;
      for (const cid of children) {
        const cMin = yMin.get(cid);
        const cMax = yMax.get(cid);
        if (cMin !== undefined && cMin < lo) lo = cMin;
        if (cMax !== undefined && cMax > hi) hi = cMax;
      }
      yVal.set(id, (lo + hi) / 2);
      yMin.set(id, lo);
      yMax.set(id, hi);
    }
  }

  // Build result map
  for (const id of dfsOrder) {
    const node = tree.get(id)!;
    const children = childIndex.get(id) ?? [];
    result.set(id, {
      id,
      x: distFromRoot.get(id) ?? 0,
      y: yVal.get(id) ?? 0,
      type: node.type,
      parentId: node.parentId,
      isLeaf: children.length === 0,
      isBranch: children.length >= 2,
    });
  }

  return result;
}
