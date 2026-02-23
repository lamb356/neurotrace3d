import type { SWCNode } from "@neurotrace/swc-parser";

/**
 * Compute branch order by walking up to soma and counting branch points.
 * A branch point is a node whose parent has 2+ children.
 */
export function getBranchOrder(
  tree: Map<number, SWCNode>,
  childIndex: Map<number, number[]>,
  nodeId: number,
): number {
  let order = 0;
  let current = nodeId;

  while (true) {
    const node = tree.get(current);
    if (!node || node.parentId === -1) break;
    const parent = tree.get(node.parentId);
    if (!parent) break;

    // If parent has 2+ children, this is a branch point
    const siblings = childIndex.get(node.parentId) ?? [];
    if (siblings.length >= 2) {
      order++;
    }

    current = node.parentId;
  }

  return order;
}

/**
 * Compute path distance from a node to the soma (root) by walking up the parent chain
 * and summing Euclidean distances between consecutive nodes.
 */
export function getPathToSoma(
  tree: Map<number, SWCNode>,
  nodeId: number,
): number {
  let distance = 0;
  let current = nodeId;

  while (true) {
    const node = tree.get(current);
    if (!node || node.parentId === -1) break;
    const parent = tree.get(node.parentId);
    if (!parent) break;

    const dx = node.x - parent.x;
    const dy = node.y - parent.y;
    const dz = node.z - parent.z;
    distance += Math.sqrt(dx * dx + dy * dy + dz * dz);

    current = node.parentId;
  }

  return distance;
}
