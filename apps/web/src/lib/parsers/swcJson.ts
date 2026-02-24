import type { SWCNode, SWCParseResult, ParseWarning } from "@neurotrace/swc-parser";

/**
 * Parse a JSON file containing neuron morphology nodes.
 *
 * Accepts:
 *   - Flat array: [{ id, type, x, y, z, radius, parent_id }, ...]
 *   - Wrapped: { morphology: [...] } or { reconstruction: [...] } or { nodes: [...] }
 *
 * Field name normalization:
 *   - parent_id / parentId / parent → parentId
 *   - r / radius → radius
 */
export function parseSwcJson(content: string): SWCParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch {
    throw new Error("Invalid JSON: could not parse file content");
  }

  // Unwrap nested structures
  const arr = extractNodeArray(raw);
  if (!arr) {
    throw new Error(
      "Invalid SWC-JSON: expected an array of node objects, or an object with a 'morphology', 'reconstruction', or 'nodes' array",
    );
  }

  const nodes = new Map<number, SWCNode>();
  const warnings: ParseWarning[] = [];

  for (let i = 0; i < arr.length; i++) {
    const entry = arr[i];
    if (typeof entry !== "object" || entry === null) {
      warnings.push({ type: "MALFORMED_LINE", message: `Entry ${i}: not an object`, line: i + 1 });
      continue;
    }

    const obj = entry as Record<string, unknown>;
    const id = toNumber(obj.id ?? obj.ID ?? obj.Id);
    if (id === null || !Number.isInteger(id)) {
      warnings.push({ type: "MALFORMED_LINE", message: `Entry ${i}: missing or invalid 'id'`, line: i + 1 });
      continue;
    }

    const type = toNumber(obj.type ?? obj.Type ?? obj.TYPE) ?? 0;
    const x = toNumber(obj.x ?? obj.X) ?? 0;
    const y = toNumber(obj.y ?? obj.Y) ?? 0;
    const z = toNumber(obj.z ?? obj.Z) ?? 0;
    const radius = toNumber(obj.radius ?? obj.r ?? obj.R ?? obj.Radius) ?? 0.5;
    const parentId = toNumber(obj.parent_id ?? obj.parentId ?? obj.parent ?? obj.pid ?? obj.ParentId ?? obj.parent_ID) ?? -1;

    if (type < 0 || type > 7) {
      warnings.push({ type: "UNKNOWN_TYPE", message: `Node ${id}: unknown type ${type}`, nodeId: id });
    }

    if (nodes.has(id)) {
      warnings.push({ type: "DUPLICATE_ID", message: `Duplicate node id: ${id}`, nodeId: id });
      continue;
    }

    nodes.set(id, { id, type, x, y, z, radius, parentId });
  }

  if (nodes.size === 0) {
    throw new Error("SWC-JSON contains no valid nodes");
  }

  // Build roots and childIndex
  const roots: number[] = [];
  const childIndex = new Map<number, number[]>();

  for (const [id, node] of nodes) {
    if (node.parentId === -1) {
      roots.push(id);
    } else if (!nodes.has(node.parentId)) {
      warnings.push({
        type: "INVALID_PARENT",
        message: `Node ${id} references non-existent parent ${node.parentId}`,
        nodeId: id,
      });
      node.parentId = -1;
      roots.push(id);
    } else {
      const children = childIndex.get(node.parentId);
      if (children) {
        children.push(id);
      } else {
        childIndex.set(node.parentId, [id]);
      }
    }
  }

  // Post-parse warnings
  if (roots.length === 0) {
    warnings.push({ type: "NO_ROOT", message: "No root nodes found (parentId === -1)" });
  }

  let hasSoma = false;
  for (const node of nodes.values()) {
    if (node.type === 1) {
      hasSoma = true;
      break;
    }
  }
  if (!hasSoma) {
    warnings.push({ type: "MISSING_SOMA", message: "No soma nodes (type 1) found" });
  }

  return {
    nodes,
    roots,
    childIndex,
    comments: [],
    metadata: { originalSource: "SWC-JSON" },
    warnings,
  };
}

// --- Helpers ---

function extractNodeArray(raw: unknown): unknown[] | null {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "object" && raw !== null) {
    const obj = raw as Record<string, unknown>;
    for (const key of ["morphology", "reconstruction", "nodes", "data"]) {
      if (Array.isArray(obj[key])) return obj[key] as unknown[];
    }
  }
  return null;
}

function toNumber(val: unknown): number | null {
  if (typeof val === "number" && !Number.isNaN(val)) return val;
  if (typeof val === "string") {
    const n = Number(val);
    if (!Number.isNaN(n)) return n;
  }
  return null;
}
