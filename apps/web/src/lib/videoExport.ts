import { Vector3, CatmullRomCurve3 } from "three";
import type { SWCNode } from "@neurotrace/swc-parser";

export type AnimationStrategy = "orbit" | "fly-along" | "zoom-to-soma";
export type VideoResolution = "720p" | "1080p" | "4k";

export interface VideoExportConfig {
  strategy: AnimationStrategy;
  duration: number; // seconds
  fps: number;
  resolution: VideoResolution;
}

export const RESOLUTION_MAP: Record<VideoResolution, { width: number; height: number }> = {
  "720p": { width: 1280, height: 720 },
  "1080p": { width: 1920, height: 1080 },
  "4k": { width: 3840, height: 2160 },
};

export const DEFAULT_VIDEO_CONFIG: VideoExportConfig = {
  strategy: "orbit",
  duration: 8,
  fps: 30,
  resolution: "1080p",
};

/** Compute bounding box center and max extent of the neuron tree */
export function computeBoundsFromTree(tree: Map<number, SWCNode>): { center: Vector3; maxExtent: number } {
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  for (const node of tree.values()) {
    if (node.x < minX) minX = node.x;
    if (node.y < minY) minY = node.y;
    if (node.z < minZ) minZ = node.z;
    if (node.x > maxX) maxX = node.x;
    if (node.y > maxY) maxY = node.y;
    if (node.z > maxZ) maxZ = node.z;
  }

  const center = new Vector3((minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2);
  const maxExtent = Math.max(maxX - minX, maxY - minY, maxZ - minZ) || 100;

  return { center, maxExtent };
}

/** Find the position of the first soma node, fallback to first root */
export function findSomaPosition(tree: Map<number, SWCNode>, roots: number[]): Vector3 {
  for (const node of tree.values()) {
    if (node.type === 1) return new Vector3(node.x, node.y, node.z);
  }
  if (roots.length > 0) {
    const r = tree.get(roots[0]);
    if (r) return new Vector3(r.x, r.y, r.z);
  }
  return new Vector3(0, 0, 0);
}

/** Find the longest path (soma → tip) for fly-along animation */
export function findLongestPath(
  tree: Map<number, SWCNode>,
  childIndex: Map<number, number[]>,
  roots: number[],
): Vector3[] {
  let longestPath: number[] = [];
  let maxLen = 0;

  for (const rootId of roots) {
    // DFS to find deepest path
    const stack: Array<{ id: number; path: number[]; dist: number }> = [
      { id: rootId, path: [rootId], dist: 0 },
    ];

    while (stack.length > 0) {
      const { id, path, dist } = stack.pop()!;
      const children = childIndex.get(id) ?? [];

      if (children.length === 0) {
        // Leaf node
        if (dist > maxLen) {
          maxLen = dist;
          longestPath = path;
        }
      } else {
        const node = tree.get(id)!;
        for (const childId of children) {
          const child = tree.get(childId);
          if (!child) continue;
          const dx = child.x - node.x;
          const dy = child.y - node.y;
          const dz = child.z - node.z;
          const edgeDist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          stack.push({ id: childId, path: [...path, childId], dist: dist + edgeDist });
        }
      }
    }
  }

  return longestPath.map((id) => {
    const n = tree.get(id)!;
    return new Vector3(n.x, n.y, n.z);
  });
}

/** Compute camera position and lookAt for a given animation frame */
export function computeCameraFrame(
  t: number, // 0..1
  strategy: AnimationStrategy,
  center: Vector3,
  maxExtent: number,
  somaPos: Vector3,
  pathCurve: CatmullRomCurve3 | null,
): { position: Vector3; lookAt: Vector3; up: Vector3 } {
  const up = new Vector3(0, 1, 0);

  switch (strategy) {
    case "orbit": {
      const angle = t * Math.PI * 2;
      const radius = maxExtent * 1.5;
      const position = new Vector3(
        center.x + Math.cos(angle) * radius,
        center.y + maxExtent * 0.3,
        center.z + Math.sin(angle) * radius,
      );
      return { position, lookAt: center.clone(), up };
    }

    case "fly-along": {
      if (!pathCurve) {
        // Fallback to orbit if no path
        return computeCameraFrame(t, "orbit", center, maxExtent, somaPos, null);
      }
      const pathPoint = pathCurve.getPointAt(Math.min(t, 0.999));
      const tangent = pathCurve.getTangentAt(Math.min(t, 0.999));
      // Offset laterally from the path
      const lateral = new Vector3().crossVectors(tangent, up).normalize();
      const offset = lateral.multiplyScalar(maxExtent * 0.3);
      const position = pathPoint.clone().add(offset).add(new Vector3(0, maxExtent * 0.15, 0));
      return { position, lookAt: pathPoint.clone(), up };
    }

    case "zoom-to-soma": {
      const farPos = new Vector3(center.x, center.y, center.z + maxExtent * 3);
      const nearPos = new Vector3(somaPos.x, somaPos.y, somaPos.z + maxExtent * 0.3);
      const position = new Vector3().lerpVectors(farPos, nearPos, t);
      const lookAt = new Vector3().lerpVectors(center, somaPos, t);
      return { position, lookAt, up };
    }
  }
}
