import type { SWCNode, SWCParseResult } from "./types.js";

/**
 * Extract a subtree rooted at the given node ID.
 *
 * Uses BFS from rootId using childIndex.
 * Returns empty Map for invalid rootId.
 * Guards against cycles with a visited set.
 */
export function getSubtree(
  result: SWCParseResult,
  rootId: number,
): Map<number, SWCNode> {
  const subtree = new Map<number, SWCNode>();
  const { nodes, childIndex } = result;

  if (!nodes.has(rootId)) return subtree;

  const visited = new Set<number>();
  const queue: number[] = [rootId];

  while (queue.length > 0) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);

    const node = nodes.get(id);
    if (!node) continue;

    subtree.set(id, node);

    const children = childIndex.get(id) ?? [];
    for (const childId of children) {
      if (!visited.has(childId)) {
        queue.push(childId);
      }
    }
  }

  return subtree;
}
