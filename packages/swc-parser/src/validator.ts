import type { SWCParseResult, ParseWarning } from "./types.js";

const WHITE = 0;
const GRAY = 1;
const BLACK = 2;

/**
 * Validate the structural integrity of a parsed SWC result.
 *
 * Performs deeper graph analysis:
 * - Cycle detection via iterative DFS with WHITE/GRAY/BLACK coloring
 * - Disconnected component detection
 *
 * Returns a fresh warnings array (does not mutate input).
 */
export function validateSWC(result: SWCParseResult): ParseWarning[] {
  const warnings: ParseWarning[] = [];
  const { nodes, roots, childIndex } = result;

  if (nodes.size === 0) return warnings;

  // Iterative DFS with cycle detection
  const color = new Map<number, number>();
  for (const id of nodes.keys()) {
    color.set(id, WHITE);
  }

  const visited = new Set<number>();

  for (const rootId of roots) {
    const stack: Array<{ id: number; entering: boolean }> = [
      { id: rootId, entering: true },
    ];

    while (stack.length > 0) {
      const frame = stack.pop()!;

      if (!frame.entering) {
        // Exiting: mark BLACK
        color.set(frame.id, BLACK);
        continue;
      }

      const nodeColor = color.get(frame.id);
      if (nodeColor === GRAY) {
        // Already processing — cycle
        warnings.push({
          type: "CYCLE_DETECTED",
          message: `Cycle detected involving node ${frame.id}`,
          nodeId: frame.id,
        });
        continue;
      }
      if (nodeColor === BLACK) {
        // Already fully processed
        continue;
      }

      // Mark GRAY (entering)
      color.set(frame.id, GRAY);
      visited.add(frame.id);

      // Push exit marker
      stack.push({ id: frame.id, entering: false });

      // Push children
      const children = childIndex.get(frame.id) ?? [];
      for (const childId of children) {
        const childColor = color.get(childId);
        if (childColor === GRAY) {
          warnings.push({
            type: "CYCLE_DETECTED",
            message: `Cycle detected: edge from ${frame.id} to ${childId}`,
            nodeId: childId,
          });
        } else if (childColor === WHITE) {
          stack.push({ id: childId, entering: true });
        }
      }
    }
  }

  // Disconnected component detection
  for (const id of nodes.keys()) {
    if (!visited.has(id)) {
      warnings.push({
        type: "DISCONNECTED_COMPONENT",
        message: `Node ${id} is not reachable from any root`,
        nodeId: id,
      });
    }
  }

  return warnings;
}
