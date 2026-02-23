import type { SWCParseResult, SWCNode } from "@neurotrace/swc-parser";
import { computeStats, validateSWC } from "@neurotrace/swc-parser";
import type { NeuronState } from "./types";

/** Rebuild childIndex, roots, stats, and warnings from the current tree */
export function recomputeDerived(state: NeuronState): void {
  // Rebuild childIndex
  const childIndex = new Map<number, number[]>();
  const roots: number[] = [];

  for (const [id, node] of state.tree) {
    if (node.parentId === -1) {
      roots.push(id);
    } else {
      const siblings = childIndex.get(node.parentId);
      if (siblings) {
        siblings.push(id);
      } else {
        childIndex.set(node.parentId, [id]);
      }
    }
  }

  state.childIndex = childIndex;
  state.roots = roots;

  // Recompute stats and warnings
  const result = toParseResult(state);
  state.stats = computeStats(result);
  state.warnings = [...result.warnings, ...validateSWC(result)];
}

/** Reconstruct an SWCParseResult facade from store fields */
export function toParseResult(state: NeuronState): SWCParseResult {
  return {
    nodes: state.tree,
    roots: state.roots,
    childIndex: state.childIndex,
    comments: state.comments,
    metadata: state.metadata,
    warnings: state.warnings,
  };
}
