import type { SWCNode } from "@neurotrace/swc-parser";

export interface ShollResult {
  radius: number;
  intersections: number;
}

/**
 * Compute Sholl analysis: count how many neurite edges cross concentric spheres
 * centered at the soma.
 */
export function computeSholl(
  tree: Map<number, SWCNode>,
  childIndex: Map<number, number[]>,
  roots: number[],
  radiusStep: number,
): ShollResult[] {
  if (tree.size === 0 || radiusStep <= 0) return [];

  // Find soma: first node with type === 1, fallback to roots[0]
  let soma: SWCNode | undefined;
  for (const node of tree.values()) {
    if (node.type === 1) {
      soma = node;
      break;
    }
  }
  if (!soma && roots.length > 0) {
    soma = tree.get(roots[0]);
  }
  if (!soma) return [];

  const cx = soma.x;
  const cy = soma.y;
  const cz = soma.z;

  // Collect all parent-child edge distances from soma
  let maxDist = 0;
  const edges: Array<{ d1: number; d2: number }> = [];

  for (const [, node] of tree) {
    if (node.parentId === -1) continue;
    const parent = tree.get(node.parentId);
    if (!parent) continue;

    const d1 = Math.sqrt(
      (parent.x - cx) ** 2 + (parent.y - cy) ** 2 + (parent.z - cz) ** 2,
    );
    const d2 = Math.sqrt(
      (node.x - cx) ** 2 + (node.y - cy) ** 2 + (node.z - cz) ** 2,
    );

    edges.push({ d1, d2 });
    maxDist = Math.max(maxDist, d1, d2);
  }

  if (edges.length === 0) return [];

  // Count intersections per shell
  const results: ShollResult[] = [];
  for (let r = radiusStep; r <= maxDist; r += radiusStep) {
    let intersections = 0;
    for (const { d1, d2 } of edges) {
      const minD = Math.min(d1, d2);
      const maxD = Math.max(d1, d2);
      if (minD < r && r <= maxD) {
        intersections++;
      }
    }
    results.push({ radius: r, intersections });
  }

  return results;
}

/** Export Sholl analysis data as a CSV file download */
export function exportShollCSV(data: ShollResult[], fileName: string): void {
  const header = "radius,intersections\n";
  const rows = data.map((d) => `${d.radius},${d.intersections}`).join("\n");
  const content = header + rows;

  const blob = new Blob([content], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
