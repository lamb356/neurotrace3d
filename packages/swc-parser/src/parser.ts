import type { SWCNode, SWCParseResult, ParseWarning, SWCMetadata } from "./types.js";
import { normalizeContent, normalizeLine, extractMetadata } from "./utils.js";

/**
 * Parse an SWC-format string into a structured result.
 *
 * Single-pass O(N) algorithm that handles 11 real-world edge cases
 * with warnings instead of throwing.
 */
export function parseSWC(content: string): SWCParseResult {
  const nodes = new Map<number, SWCNode>();
  const roots: number[] = [];
  const childIndex = new Map<number, number[]>();
  const comments: string[] = [];
  const metadata: SWCMetadata = {};
  const warnings: ParseWarning[] = [];

  if (!content || content.trim().length === 0) {
    return { nodes, roots, childIndex, comments, metadata, warnings };
  }

  const normalized = normalizeContent(content);
  const lines = normalized.split("\n");

  // Pass 1: parse all lines
  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const raw = normalizeLine(lines[i]);

    if (raw.length === 0) continue;

    if (raw.startsWith("#")) {
      comments.push(raw);
      extractMetadata(raw, metadata);
      continue;
    }

    const parts = raw.split(/\s+/);
    if (parts.length !== 7) {
      warnings.push({
        type: "MALFORMED_LINE",
        message: `Expected 7 columns, got ${parts.length}`,
        line: lineNum,
      });
      continue;
    }

    const id = Number(parts[0]);
    const type = Number(parts[1]);
    const x = Number(parts[2]);
    const y = Number(parts[3]);
    const z = Number(parts[4]);
    const radius = Number(parts[5]);
    const parentId = Number(parts[6]);

    if ([id, type, x, y, z, radius, parentId].some((v) => Number.isNaN(v))) {
      warnings.push({
        type: "MALFORMED_LINE",
        message: "Non-numeric value in data line",
        line: lineNum,
      });
      continue;
    }

    if (nodes.has(id)) {
      warnings.push({
        type: "DUPLICATE_ID",
        message: `Duplicate node ID ${id}`,
        line: lineNum,
        nodeId: id,
      });
      continue;
    }

    if (type < 0 || type > 7) {
      warnings.push({
        type: "UNKNOWN_TYPE",
        message: `Unknown type code ${type}`,
        line: lineNum,
        nodeId: id,
      });
    }

    if (radius < 0 || radius > 100) {
      warnings.push({
        type: "RADIUS_OUTLIER",
        message: `Radius ${radius} outside expected range [0, 100]`,
        line: lineNum,
        nodeId: id,
      });
    }

    nodes.set(id, { id, type, x, y, z, radius, parentId });
  }

  // Pass 2: build tree structure
  for (const [id, node] of nodes) {
    childIndex.set(id, []);
  }

  for (const [id, node] of nodes) {
    if (node.parentId === -1) {
      roots.push(id);
    } else if (nodes.has(node.parentId)) {
      childIndex.get(node.parentId)!.push(id);
    } else {
      warnings.push({
        type: "INVALID_PARENT",
        message: `Node ${id} references missing parent ${node.parentId}`,
        nodeId: id,
      });
      node.parentId = -1;
      roots.push(id);
    }
  }

  // Post-parse checks
  if (roots.length === 0 && nodes.size > 0) {
    // No roots found — pick lowest ID as root
    let minId = Infinity;
    for (const id of nodes.keys()) {
      if (id < minId) minId = id;
    }
    warnings.push({
      type: "NO_ROOT",
      message: `No root node found, using node ${minId} as root`,
      nodeId: minId,
    });
    const node = nodes.get(minId)!;
    node.parentId = -1;
    roots.push(minId);
  }

  // Check for non-sequential IDs
  if (nodes.size > 1) {
    const ids = Array.from(nodes.keys()).sort((a, b) => a - b);
    let sequential = true;
    for (let i = 1; i < ids.length; i++) {
      if (ids[i] !== ids[i - 1] + 1) {
        sequential = false;
        break;
      }
    }
    if (!sequential) {
      warnings.push({
        type: "NON_SEQUENTIAL_IDS",
        message: "Node IDs are not sequential",
      });
    }
  }

  // Check for missing soma
  let hasSoma = false;
  for (const node of nodes.values()) {
    if (node.type === 1) {
      hasSoma = true;
      break;
    }
  }
  if (!hasSoma && nodes.size > 0) {
    warnings.push({
      type: "MISSING_SOMA",
      message: "No soma (type 1) node found",
    });
  }

  return { nodes, roots, childIndex, comments, metadata, warnings };
}
