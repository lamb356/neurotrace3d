import type { SWCNode } from "@neurotrace/swc-parser";

export type WarningSeverity = "error" | "warning" | "info";

export interface EnhancedWarning {
  type: string;
  message: string;
  nodeId?: number;
  severity: WarningSeverity;
}

/**
 * Compute additional validation warnings beyond what the parser/validator provides.
 */
export function computeExtraWarnings(
  tree: Map<number, SWCNode>,
  childIndex: Map<number, number[]>,
): EnhancedWarning[] {
  const warnings: EnhancedWarning[] = [];

  for (const [id, node] of tree) {
    // Zero-radius nodes
    if (node.radius === 0) {
      warnings.push({
        type: "ZERO_RADIUS",
        message: `Node ${id} has zero radius`,
        nodeId: id,
        severity: "warning",
      });
    }

    // Undefined type nodes (type === 0)
    if (node.type === 0) {
      warnings.push({
        type: "UNDEFINED_TYPE",
        message: `Node ${id} has undefined type (0)`,
        nodeId: id,
        severity: "warning",
      });
    }

    // Invalid parent references
    if (node.parentId !== -1 && !tree.has(node.parentId)) {
      warnings.push({
        type: "INVALID_PARENT",
        message: `Node ${id} references non-existent parent ${node.parentId}`,
        nodeId: id,
        severity: "error",
      });
    }

    // Short segments
    if (node.parentId !== -1) {
      const parent = tree.get(node.parentId);
      if (parent) {
        const dx = node.x - parent.x;
        const dy = node.y - parent.y;
        const dz = node.z - parent.z;
        const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (len < 0.01) {
          warnings.push({
            type: "SHORT_SEGMENT",
            message: `Edge ${node.parentId} → ${id} is very short (${len.toFixed(4)} um)`,
            nodeId: id,
            severity: "info",
          });
        }
      }
    }
  }

  return warnings;
}

/** Map parse WarningType strings to severity levels */
export function getWarningSeverity(type: string): WarningSeverity {
  switch (type) {
    case "CYCLE_DETECTED":
    case "DUPLICATE_ID":
    case "NO_ROOT":
    case "INVALID_PARENT":
      return "error";
    case "MISSING_SOMA":
    case "RADIUS_OUTLIER":
    case "UNKNOWN_TYPE":
    case "ZERO_RADIUS":
    case "UNDEFINED_TYPE":
      return "warning";
    case "NON_SEQUENTIAL_IDS":
    case "DISCONNECTED_COMPONENT":
    case "SHORT_SEGMENT":
    case "MALFORMED_LINE":
      return "info";
    default:
      return "info";
  }
}

const SEVERITY_ORDER: Record<WarningSeverity, number> = {
  error: 0,
  warning: 1,
  info: 2,
};

/** Sort warnings: errors first, then warnings, then info */
export function sortBySeverity(a: { severity: WarningSeverity }, b: { severity: WarningSeverity }): number {
  return SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
}
