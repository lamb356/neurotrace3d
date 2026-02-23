import type { SWCNode } from "@neurotrace/swc-parser";

export function euclideanDistance(a: SWCNode, b: SWCNode): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * BFS to find shortest path between two nodes via tree edges (undirected).
 * Returns sum of edge lengths, or null if no path exists.
 */
export function pathDistance(
  tree: Map<number, SWCNode>,
  childIndex: Map<number, number[]>,
  idA: number,
  idB: number,
): number | null {
  if (idA === idB) return 0;

  // Build undirected adjacency
  const adj = new Map<number, number[]>();
  for (const [id, node] of tree) {
    if (!adj.has(id)) adj.set(id, []);
    if (node.parentId !== -1 && tree.has(node.parentId)) {
      adj.get(id)!.push(node.parentId);
      if (!adj.has(node.parentId)) adj.set(node.parentId, []);
      adj.get(node.parentId)!.push(id);
    }
  }

  const visited = new Set<number>([idA]);
  const prev = new Map<number, number>();
  const queue: number[] = [idA];

  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (cur === idB) {
      // Trace back and sum edge lengths
      let total = 0;
      let nodeId = idB;
      while (prev.has(nodeId)) {
        const parentId = prev.get(nodeId)!;
        total += euclideanDistance(tree.get(nodeId)!, tree.get(parentId)!);
        nodeId = parentId;
      }
      return total;
    }
    for (const neighbor of adj.get(cur) ?? []) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        prev.set(neighbor, cur);
        queue.push(neighbor);
      }
    }
  }

  return null;
}

/** Angle at node B between vectors BA and BC, in degrees */
export function branchAngle(a: SWCNode, b: SWCNode, c: SWCNode): number {
  const bax = a.x - b.x, bay = a.y - b.y, baz = a.z - b.z;
  const bcx = c.x - b.x, bcy = c.y - b.y, bcz = c.z - b.z;
  const dot = bax * bcx + bay * bcy + baz * bcz;
  const magBA = Math.sqrt(bax * bax + bay * bay + baz * baz);
  const magBC = Math.sqrt(bcx * bcx + bcy * bcy + bcz * bcz);
  if (magBA === 0 || magBC === 0) return 0;
  const cos = Math.max(-1, Math.min(1, dot / (magBA * magBC)));
  return Math.acos(cos) * (180 / Math.PI);
}
