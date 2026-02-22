import type { SWCNode, SWCParseResult, ParseWarning, SWCMetadata } from "./types.js";
import { extractMetadata } from "./utils.js";

// Char codes
const CH_SPACE = 32;
const CH_TAB = 9;
const CH_LF = 10;
const CH_CR = 13;
const CH_HASH = 35;

/**
 * Parse 7 space-separated numeric fields from content[start..end).
 * Returns a 7-element array or null on malformed input.
 */
function parseDataLine(
  s: string,
  start: number,
  end: number,
): number[] | null {
  const values: number[] = [];
  let i = start;

  while (i < end) {
    while (i < end && (s.charCodeAt(i) === CH_SPACE || s.charCodeAt(i) === CH_TAB)) i++;
    if (i >= end) break;

    let j = i;
    while (j < end && s.charCodeAt(j) !== CH_SPACE && s.charCodeAt(j) !== CH_TAB) j++;

    values.push(+s.substring(i, j));
    i = j;
  }

  if (values.length !== 7) return null;

  if (
    values[0] !== values[0] || values[1] !== values[1] || values[2] !== values[2] ||
    values[3] !== values[3] || values[4] !== values[4] || values[5] !== values[5] ||
    values[6] !== values[6]
  ) {
    return null;
  }

  return values;
}

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

  if (!content) {
    return { nodes, roots, childIndex, comments, metadata, warnings };
  }

  const len = content.length;
  let lineStart = 0;
  let lineNum = 0;

  let prevId = -Infinity;
  let isSequential = true;
  let hasSoma = false;

  while (lineStart <= len) {
    lineNum++;

    // Find end of line
    let lineEnd = lineStart;
    while (lineEnd < len && content.charCodeAt(lineEnd) !== CH_LF) lineEnd++;

    // Trim trailing \r
    let trimEnd = lineEnd;
    if (trimEnd > lineStart && content.charCodeAt(trimEnd - 1) === CH_CR) trimEnd--;

    // Skip leading whitespace
    let trimStart = lineStart;
    while (trimStart < trimEnd) {
      const c = content.charCodeAt(trimStart);
      if (c !== CH_SPACE && c !== CH_TAB) break;
      trimStart++;
    }
    // Trim trailing whitespace
    while (trimEnd > trimStart) {
      const c = content.charCodeAt(trimEnd - 1);
      if (c !== CH_SPACE && c !== CH_TAB) break;
      trimEnd--;
    }

    if (trimStart >= trimEnd) {
      lineStart = lineEnd + 1;
      continue;
    }

    // Comment line
    if (content.charCodeAt(trimStart) === CH_HASH) {
      const commentStr = content.substring(trimStart, trimEnd);
      comments.push(commentStr);
      extractMetadata(commentStr, metadata);
      lineStart = lineEnd + 1;
      continue;
    }

    // Data line
    const parsed = parseDataLine(content, trimStart, trimEnd);
    if (!parsed) {
      warnings.push({
        type: "MALFORMED_LINE",
        message: "Malformed data line",
        line: lineNum,
      });
      lineStart = lineEnd + 1;
      continue;
    }

    const id = parsed[0] | 0;
    const type = parsed[1] | 0;
    const x = parsed[2];
    const y = parsed[3];
    const z = parsed[4];
    const radius = parsed[5];
    const parentId = parsed[6] | 0;

    if (nodes.has(id)) {
      warnings.push({
        type: "DUPLICATE_ID",
        message: `Duplicate node ID ${id}`,
        line: lineNum,
        nodeId: id,
      });
      lineStart = lineEnd + 1;
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

    if (type === 1) hasSoma = true;

    if (isSequential && prevId !== -Infinity && id !== prevId + 1) {
      isSequential = false;
    }
    prevId = id;

    nodes.set(id, { id, type, x, y, z, radius, parentId });

    lineStart = lineEnd + 1;
  }

  // Build tree structure — allocate childIndex arrays only as needed
  for (const [id, node] of nodes) {
    if (node.parentId === -1) {
      roots.push(id);
    } else if (nodes.has(node.parentId)) {
      const children = childIndex.get(node.parentId);
      if (children) {
        children.push(id);
      } else {
        childIndex.set(node.parentId, [id]);
      }
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

  if (!isSequential && nodes.size > 1) {
    warnings.push({
      type: "NON_SEQUENTIAL_IDS",
      message: "Node IDs are not sequential",
    });
  }

  if (!hasSoma && nodes.size > 0) {
    warnings.push({
      type: "MISSING_SOMA",
      message: "No soma (type 1) node found",
    });
  }

  return { nodes, roots, childIndex, comments, metadata, warnings };
}
