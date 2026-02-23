import type { SWCNode } from "@neurotrace/swc-parser";

export type TreeOpType = "MOVE" | "DELETE" | "INSERT" | "RETYPE" | "RESIZE" | "REPARENT";

export interface TreeOp {
  type: TreeOpType;
  nodeId: number;
  before: Partial<SWCNode>;
  after: Partial<SWCNode>;
  /** Full node snapshot for INSERT/DELETE operations */
  nodeSnapshot?: SWCNode;
}

/** Apply a batch of operations to the tree (forward direction) */
export function applyOpsToTree(tree: Map<number, SWCNode>, ops: TreeOp[]): void {
  for (const op of ops) {
    if (op.type === "INSERT") {
      if (op.nodeSnapshot) {
        tree.set(op.nodeId, { ...op.nodeSnapshot, ...op.after });
      }
    } else if (op.type === "DELETE") {
      tree.delete(op.nodeId);
    } else {
      const node = tree.get(op.nodeId);
      if (node) {
        Object.assign(node, op.after);
      }
    }
  }
}

/** Invert a batch of operations for undo */
export function invertOps(ops: TreeOp[]): TreeOp[] {
  return ops
    .slice()
    .reverse()
    .map((op) => {
      if (op.type === "INSERT") {
        return {
          ...op,
          type: "DELETE" as const,
          before: op.after,
          after: op.before,
        };
      }
      if (op.type === "DELETE") {
        return {
          ...op,
          type: "INSERT" as const,
          before: op.after,
          after: op.before,
        };
      }
      return {
        ...op,
        before: op.after,
        after: op.before,
      };
    });
}
