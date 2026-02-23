import type { MorphometricsResult } from "@/lib/morphometrics-types";
import qh from "quickhull3d";

interface SWCNodeData {
  id: number;
  type: number;
  x: number;
  y: number;
  z: number;
  radius: number;
  parentId: number;
}

interface WorkerInput {
  nodes: [number, SWCNodeData][];
  childIndex: [number, number[]][];
}

self.onmessage = (e: MessageEvent<WorkerInput>) => {
  try {
    const result = compute(e.data);
    self.postMessage({ type: "result", data: result });
  } catch (err) {
    self.postMessage({ type: "error", message: String(err) });
  }
};

function compute(input: WorkerInput): MorphometricsResult {
  const tree = new Map<number, SWCNodeData>(input.nodes);
  const childIndex = new Map<number, number[]>(input.childIndex);

  let totalLength = 0;
  let totalSurface = 0;
  let totalVolume = 0;
  let branchCount = 0;
  let tipCount = 0;
  const branchAngles: number[] = [];

  // Identify tips and branches
  for (const [id] of tree) {
    const children = childIndex.get(id) ?? [];
    if (children.length === 0) tipCount++;
    if (children.length >= 2) branchCount++;
  }

  // Edge-based metrics: totalLength, totalSurface, totalVolume
  for (const [, node] of tree) {
    if (node.parentId === -1) continue;
    const parent = tree.get(node.parentId);
    if (!parent) continue;

    const dx = node.x - parent.x;
    const dy = node.y - parent.y;
    const dz = node.z - parent.z;
    const segLen = Math.sqrt(dx * dx + dy * dy + dz * dz);

    totalLength += segLen;

    const r1 = parent.radius;
    const r2 = node.radius;
    // Frustum lateral surface: π(r1+r2) * slant_height ≈ π(r1+r2) * segLen for thin segments
    totalSurface += Math.PI * (r1 + r2) * segLen;
    // Frustum volume: π(r1²+r1r2+r2²) * segLen / 3
    totalVolume += (Math.PI * (r1 * r1 + r1 * r2 + r2 * r2) * segLen) / 3;
  }

  // Branch angles: at each branch point, angle between each pair of child vectors
  for (const [id] of tree) {
    const children = childIndex.get(id) ?? [];
    if (children.length < 2) continue;
    const branchNode = tree.get(id)!;

    for (let i = 0; i < children.length; i++) {
      for (let j = i + 1; j < children.length; j++) {
        const c1 = tree.get(children[i]);
        const c2 = tree.get(children[j]);
        if (!c1 || !c2) continue;

        const v1x = c1.x - branchNode.x;
        const v1y = c1.y - branchNode.y;
        const v1z = c1.z - branchNode.z;
        const v2x = c2.x - branchNode.x;
        const v2y = c2.y - branchNode.y;
        const v2z = c2.z - branchNode.z;

        const dot = v1x * v2x + v1y * v2y + v1z * v2z;
        const mag1 = Math.sqrt(v1x * v1x + v1y * v1y + v1z * v1z);
        const mag2 = Math.sqrt(v2x * v2x + v2y * v2y + v2z * v2z);
        if (mag1 === 0 || mag2 === 0) continue;
        const cos = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
        branchAngles.push(Math.acos(cos) * (180 / Math.PI));
      }
    }
  }

  // Strahler order (iterative bottom-up)
  const strahlerOrder = new Map<number, number>();
  const processedChildren = new Map<number, number>(); // count of processed children per node

  // Initialize: all tips get order 1
  const queue: number[] = [];
  for (const [id] of tree) {
    const children = childIndex.get(id) ?? [];
    processedChildren.set(id, 0);
    if (children.length === 0) {
      strahlerOrder.set(id, 1);
      const node = tree.get(id)!;
      if (node.parentId !== -1 && tree.has(node.parentId)) {
        queue.push(node.parentId);
      }
    }
  }

  // Process parents when all children are done
  while (queue.length > 0) {
    const parentId = queue.shift()!;
    const count = (processedChildren.get(parentId) ?? 0) + 1;
    processedChildren.set(parentId, count);

    const children = childIndex.get(parentId) ?? [];
    if (count < children.length) continue; // not all children processed yet

    // All children processed — compute Strahler order
    const childOrders: number[] = [];
    for (const cid of children) {
      const order = strahlerOrder.get(cid);
      if (order !== undefined) childOrders.push(order);
    }

    if (childOrders.length === 0) {
      strahlerOrder.set(parentId, 1);
    } else {
      const maxOrder = Math.max(...childOrders);
      const allSame = childOrders.every((o) => o === maxOrder);
      strahlerOrder.set(parentId, allSame && childOrders.length >= 2 ? maxOrder + 1 : maxOrder);
    }

    const node = tree.get(parentId)!;
    if (node.parentId !== -1 && tree.has(node.parentId)) {
      queue.push(node.parentId);
    }
  }

  let maxStrahlerOrder = 0;
  for (const order of strahlerOrder.values()) {
    if (order > maxStrahlerOrder) maxStrahlerOrder = order;
  }

  // Tip path lengths (path distance from soma for every tip)
  const tipPathLengths: number[] = [];
  for (const [id] of tree) {
    const children = childIndex.get(id) ?? [];
    if (children.length !== 0) continue;
    // Walk up to root
    let dist = 0;
    let cur = id;
    while (true) {
      const node = tree.get(cur);
      if (!node || node.parentId === -1) break;
      const parent = tree.get(node.parentId);
      if (!parent) break;
      const dx = node.x - parent.x;
      const dy = node.y - parent.y;
      const dz = node.z - parent.z;
      dist += Math.sqrt(dx * dx + dy * dy + dz * dz);
      cur = node.parentId;
    }
    tipPathLengths.push(dist);
  }

  // Segment tortuosity: for each branch segment (branch point to next branch/tip),
  // ratio of path length to Euclidean distance
  const segmentTortuosity: { nodeId: number; value: number }[] = [];
  // Find branch points and root as segment starts
  const segStarts: number[] = [];
  for (const [id] of tree) {
    const children = childIndex.get(id) ?? [];
    if (children.length >= 2) segStarts.push(id);
  }
  // Also add roots
  for (const [id, node] of tree) {
    if (node.parentId === -1) segStarts.push(id);
  }

  for (const startId of segStarts) {
    const startNode = tree.get(startId)!;
    const children = childIndex.get(startId) ?? [];
    for (const childId of children) {
      // Walk from childId until next branch or tip
      let pathLen = 0;
      let cur = childId;
      let prev = startId;
      while (true) {
        const node = tree.get(cur);
        if (!node) break;
        const prevNode = tree.get(prev)!;
        const dx = node.x - prevNode.x;
        const dy = node.y - prevNode.y;
        const dz = node.z - prevNode.z;
        pathLen += Math.sqrt(dx * dx + dy * dy + dz * dz);

        const curChildren = childIndex.get(cur) ?? [];
        if (curChildren.length !== 1) break; // branch or tip
        prev = cur;
        cur = curChildren[0];
      }

      const endNode = tree.get(cur);
      if (!endNode) continue;
      const edx = endNode.x - startNode.x;
      const edy = endNode.y - startNode.y;
      const edz = endNode.z - startNode.z;
      const eucDist = Math.sqrt(edx * edx + edy * edy + edz * edz);
      if (eucDist > 0) {
        segmentTortuosity.push({ nodeId: startId, value: pathLen / eucDist });
      }
    }
  }

  // Convex hull volume via quickhull3d
  let convexHullVolume = 0;
  const points: [number, number, number][] = [];
  for (const [, node] of tree) {
    points.push([node.x, node.y, node.z]);
  }

  if (points.length >= 4) {
    try {
      const faces = qh(points);
      // Volume via signed tetrahedra (origin to each triangle face)
      let vol = 0;
      for (const face of faces) {
        if (face.length < 3) continue;
        const a = points[face[0]];
        const b = points[face[1]];
        const c = points[face[2]];
        // Signed volume of tetrahedron with origin
        vol +=
          (a[0] * (b[1] * c[2] - b[2] * c[1]) -
            a[1] * (b[0] * c[2] - b[2] * c[0]) +
            a[2] * (b[0] * c[1] - b[1] * c[0])) /
          6;
      }
      convexHullVolume = Math.abs(vol);
    } catch {
      // Degenerate geometry (collinear points)
      convexHullVolume = 0;
    }
  }

  // Fractal dimension via box-counting
  let fractalDimension = 0;
  if (points.length >= 2) {
    let pxMin = Infinity, pyMin = Infinity, pzMin = Infinity;
    let pxMax = -Infinity, pyMax = -Infinity, pzMax = -Infinity;
    for (const [px, py, pz] of points) {
      if (px < pxMin) pxMin = px;
      if (py < pyMin) pyMin = py;
      if (pz < pzMin) pzMin = pz;
      if (px > pxMax) pxMax = px;
      if (py > pyMax) pyMax = py;
      if (pz > pzMax) pzMax = pz;
    }
    const span = Math.max(pxMax - pxMin, pyMax - pyMin, pzMax - pzMin, 1);

    // Count occupied boxes at multiple scales
    const logEps: number[] = [];
    const logN: number[] = [];

    for (let divisions = 2; divisions <= 64; divisions *= 2) {
      const boxSize = span / divisions;
      const occupied = new Set<string>();
      for (const [px, py, pz] of points) {
        const bx = Math.floor((px - pxMin) / boxSize);
        const by = Math.floor((py - pyMin) / boxSize);
        const bz = Math.floor((pz - pzMin) / boxSize);
        occupied.add(`${bx},${by},${bz}`);
      }
      logEps.push(Math.log(1 / boxSize));
      logN.push(Math.log(occupied.size));
    }

    // Linear regression: slope = fractal dimension
    if (logEps.length >= 2) {
      const n = logEps.length;
      let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
      for (let i = 0; i < n; i++) {
        sumX += logEps[i];
        sumY += logN[i];
        sumXY += logEps[i] * logN[i];
        sumX2 += logEps[i] * logEps[i];
      }
      const denom = n * sumX2 - sumX * sumX;
      if (denom !== 0) {
        fractalDimension = (n * sumXY - sumX * sumY) / denom;
      }
    }
  }

  return {
    totalLength,
    totalSurface,
    totalVolume,
    branchCount,
    tipCount,
    maxStrahlerOrder,
    branchAngles,
    tipPathLengths,
    segmentTortuosity,
    convexHullVolume,
    fractalDimension,
  };
}
