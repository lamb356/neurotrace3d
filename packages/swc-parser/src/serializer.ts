import type { SWCParseResult } from "./types.js";

/**
 * Serialize a parsed SWC result back to SWC-format string.
 *
 * Preserves original comments, adds structured metadata,
 * and emits nodes sorted by ID.
 */
export function serializeSWC(result: SWCParseResult): string {
  const lines: string[] = [];

  // Emit preserved comments
  const metadataKeys = new Set<string>();
  const metadataEntries: [string, string | undefined][] = [
    ["ORIGINAL_SOURCE", result.metadata.originalSource],
    ["CREATURE", result.metadata.species],
    ["REGION", result.metadata.brainRegion],
    ["CELL_TYPE", result.metadata.cellType],
  ];

  // Track which metadata keys are already in comments
  for (const comment of result.comments) {
    for (const [key] of metadataEntries) {
      const pattern = new RegExp(`^#?\\s*${key}\\s`, "i");
      if (pattern.test(comment)) {
        metadataKeys.add(key);
      }
    }
  }

  // Emit original comments
  for (const comment of result.comments) {
    lines.push(comment);
  }

  // Emit metadata that wasn't in original comments
  for (const [key, value] of metadataEntries) {
    if (value && !metadataKeys.has(key)) {
      lines.push(`# ${key} ${value}`);
    }
  }

  // Emit nodes sorted by ID
  const sortedIds = Array.from(result.nodes.keys()).sort((a, b) => a - b);
  for (const id of sortedIds) {
    const n = result.nodes.get(id)!;
    lines.push(`${n.id} ${n.type} ${n.x} ${n.y} ${n.z} ${n.radius} ${n.parentId}`);
  }

  return lines.join("\n") + "\n";
}
