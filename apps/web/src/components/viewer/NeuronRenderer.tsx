"use client";

import { useEffect, useRef, useMemo, useCallback } from "react";
import {
  InstancedMesh,
  SphereGeometry,
  CylinderGeometry,
  MeshPhysicalMaterial,
  Matrix4,
  Color,
  Vector3,
  Quaternion,
  InstancedBufferAttribute,
  Object3D,
} from "three";
import { useThree, useFrame } from "@react-three/fiber";
import { useNeuronStore } from "@/store/useNeuronStore";
import { getTypeThreeColor } from "@/lib/colors";
import type { SWCNode } from "@neurotrace/swc-parser";

/** Maps instance indices <-> node IDs for raycasting */
export interface InstanceMapping {
  instanceToNodeId: number[];
  nodeIdToInstance: Map<number, number>;
}

export function buildInstanceMapping(tree: Map<number, unknown>): InstanceMapping {
  const instanceToNodeId: number[] = [];
  const nodeIdToInstance = new Map<number, number>();
  let idx = 0;
  for (const id of tree.keys()) {
    instanceToNodeId[idx] = id;
    nodeIdToInstance.set(id, idx);
    idx++;
  }
  return { instanceToNodeId, nodeIdToInstance };
}

const tmpMatrix = new Matrix4();
const tmpColor = new Color();
const tmpVec = new Vector3();
const tmpVec2 = new Vector3();
const tmpQuat = new Quaternion();
const tmpObj = new Object3D();
const UP = new Vector3(0, 1, 0);

/** Shared MeshPhysicalMaterial for both spheres and cylinders */
function createSharedMaterial(): MeshPhysicalMaterial {
  const mat = new MeshPhysicalMaterial({
    roughness: 0.45,
    metalness: 0.0,
    clearcoat: 0.2,
    clearcoatRoughness: 0.4,
    thickness: 0.4,
    attenuationDistance: 8.0,
    attenuationColor: new Color("#ff6060"),
    transmission: 0.05,
    toneMapped: false,
  });

  mat.onBeforeCompile = (shader) => {
    // Add instance attributes for taper (cylinders only)
    shader.vertexShader = shader.vertexShader.replace(
      "#include <common>",
      `#include <common>
attribute float instanceParentR;
attribute float instanceChildR;
`,
    );

    // Apply taper: interpolate radius along Y axis
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
if (instanceParentR > 0.0) {
  float t = position.y * 0.5 + 0.5;
  float r = mix(instanceParentR, instanceChildR, t);
  transformed.xz *= r;
}
`,
    );

    // Add fluorescence glow in fragment shader
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <dithering_fragment>",
      `#include <dithering_fragment>
gl_FragColor.rgb += gl_FragColor.rgb * 0.12;
`,
    );
  };

  return mat;
}

/** LOD cylinder geometries keyed by segment count */
const LOD_SEGMENTS = [8, 5, 3] as const;
const LOD_THRESHOLDS = [200, 800] as const;

export default function NeuronRenderer() {
  const tree = useNeuronStore((s) => s.tree);
  const childIndex = useNeuronStore((s) => s.childIndex);
  const hoveredId = useNeuronStore((s) => s.hovered);
  const selectedIds = useNeuronStore((s) => s.selection);
  const navCursorId = useNeuronStore((s) => s.navCursor);
  const setHovered = useNeuronStore((s) => s.setHovered);

  const sphereMeshRef = useRef<InstancedMesh>(null);
  const cylinderMeshRef = useRef<InstancedMesh>(null);
  const { invalidate, camera } = useThree();

  const mapping = useMemo(() => buildInstanceMapping(tree), [tree]);
  const nodeCount = tree.size;

  // Count edges (nodes with parentId !== -1)
  const edgeCount = useMemo(() => {
    let count = 0;
    for (const [, node] of tree) {
      if (node.parentId !== -1 && tree.has(node.parentId)) count++;
    }
    return count;
  }, [tree]);

  // Shared material
  const sharedMaterial = useMemo(() => createSharedMaterial(), []);

  // Sphere geometry (upgraded to 16x12)
  const sphereGeom = useMemo(() => new SphereGeometry(1, 16, 12), []);

  // LOD cylinder geometries
  const lodGeometries = useMemo(
    () => LOD_SEGMENTS.map((segs) => new CylinderGeometry(1, 1, 1, segs, 1)),
    [],
  );

  const currentLodRef = useRef(0);

  // Compute "display radius" for junction sphere matching
  const computeDisplayRadius = useCallback(
    (nodeId: number, node: SWCNode): number => {
      const radii: number[] = [];
      // If node has parent edge
      if (node.parentId !== -1) {
        const parent = tree.get(node.parentId);
        if (parent) {
          radii.push((node.radius + parent.radius) / 2);
        }
      }
      // For each child edge
      const children = childIndex.get(nodeId) ?? [];
      for (const childId of children) {
        const child = tree.get(childId);
        if (child) {
          radii.push((node.radius + child.radius) / 2);
        }
      }
      if (radii.length === 0) return Math.max(node.radius, 0.3);
      const avg = radii.reduce((a, b) => a + b, 0) / radii.length;
      return Math.max(avg, 0.3);
    },
    [tree, childIndex],
  );

  // Build edge mapping for click handling on cylinders
  const edgeMapping = useMemo(() => {
    const instanceToChildId: number[] = [];
    let idx = 0;
    for (const [, node] of tree) {
      if (node.parentId === -1 || !tree.has(node.parentId)) continue;
      instanceToChildId[idx] = node.id;
      idx++;
    }
    return instanceToChildId;
  }, [tree]);

  // Click handler
  const handleClick = (instanceId: number, shiftKey: boolean) => {
    const nodeId = mapping.instanceToNodeId[instanceId];
    if (nodeId === undefined) return;
    const store = useNeuronStore.getState();

    if (store.activeTool === "insert") {
      const node = store.tree.get(nodeId);
      if (node && node.parentId !== -1) {
        const parent = store.tree.get(node.parentId);
        if (parent) {
          store.insertNode(node.parentId, nodeId, {
            x: (parent.x + node.x) / 2,
            y: (parent.y + node.y) / 2,
            z: (parent.z + node.z) / 2,
          });
        }
      }
      return;
    }

    if (store.activeTool === "delete") {
      store.deleteNodes([nodeId]);
      return;
    }

    if (store.activeTool === "measure-distance" || store.activeTool === "measure-angle") {
      store.addMeasurePending(nodeId);
      return;
    }

    if (store.activeTool === "path-select") {
      store.addPathSelectPending(nodeId, shiftKey);
      return;
    }

    if (shiftKey) {
      store.toggleSelection(nodeId);
    } else {
      store.selectNode(nodeId);
    }
  };

  const handleDoubleClick = (instanceId: number) => {
    const nodeId = mapping.instanceToNodeId[instanceId];
    if (nodeId !== undefined) {
      useNeuronStore.getState().setFocusTarget(nodeId);
    }
  };

  // Build sphere InstancedMesh matrices and colors
  useEffect(() => {
    const mesh = sphereMeshRef.current;
    if (!mesh) return;

    let idx = 0;
    for (const [id, node] of tree) {
      const scale = computeDisplayRadius(id, node);
      tmpMatrix.makeScale(scale, scale, scale);
      tmpMatrix.setPosition(node.x, node.y, node.z);
      mesh.setMatrixAt(idx, tmpMatrix);
      mesh.setColorAt(idx, getTypeThreeColor(node.type));
      idx++;
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    invalidate();
  }, [tree, childIndex, computeDisplayRadius, invalidate]);

  // Build cylinder InstancedMesh matrices, colors, and taper attributes
  useEffect(() => {
    const mesh = cylinderMeshRef.current;
    if (!mesh || edgeCount === 0) return;

    const parentRadii = new Float32Array(edgeCount);
    const childRadii = new Float32Array(edgeCount);

    let idx = 0;
    for (const [, node] of tree) {
      if (node.parentId === -1) continue;
      const parent = tree.get(node.parentId);
      if (!parent) continue;

      // Compute midpoint, direction, length
      tmpVec.set(parent.x, parent.y, parent.z);
      tmpVec2.set(node.x, node.y, node.z);
      const length = tmpVec.distanceTo(tmpVec2);

      // Midpoint
      const mx = (parent.x + node.x) / 2;
      const my = (parent.y + node.y) / 2;
      const mz = (parent.z + node.z) / 2;

      // Direction (parent → child)
      tmpVec2.sub(tmpVec).normalize();

      // Quaternion from UP to direction
      tmpQuat.setFromUnitVectors(UP, tmpVec2);

      // Average radius for base cylinder scale (taper handled in shader)
      const avgR = (parent.radius + node.radius) / 2;

      tmpObj.position.set(mx, my, mz);
      tmpObj.quaternion.copy(tmpQuat);
      tmpObj.scale.set(avgR, Math.max(length, 0.01), avgR);
      tmpObj.updateMatrix();

      mesh.setMatrixAt(idx, tmpObj.matrix);
      mesh.setColorAt(idx, getTypeThreeColor(node.type));

      // Store taper radii (normalized: shader multiplies by these)
      parentRadii[idx] = parent.radius / Math.max(avgR, 0.01);
      childRadii[idx] = node.radius / Math.max(avgR, 0.01);

      idx++;
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    // Set taper attributes
    mesh.geometry.setAttribute(
      "instanceParentR",
      new InstancedBufferAttribute(parentRadii, 1),
    );
    mesh.geometry.setAttribute(
      "instanceChildR",
      new InstancedBufferAttribute(childRadii, 1),
    );

    invalidate();
  }, [tree, edgeCount, invalidate]);

  // Update highlight/selection colors for spheres
  useEffect(() => {
    const mesh = sphereMeshRef.current;
    if (!mesh) return;

    for (const [id, node] of tree) {
      const idx = mapping.nodeIdToInstance.get(id);
      if (idx === undefined) continue;

      if (navCursorId === id) {
        tmpColor.set("#00bcd4");
      } else if (selectedIds.has(id)) {
        tmpColor.set("#e67e22");
      } else if (hoveredId === id) {
        tmpColor.set("#f1c40f");
      } else {
        tmpColor.copy(getTypeThreeColor(node.type));
      }
      mesh.setColorAt(idx, tmpColor);
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    invalidate();
  }, [tree, hoveredId, selectedIds, navCursorId, mapping, invalidate]);

  // LOD: swap cylinder geometry based on camera distance
  useFrame(() => {
    if (!cylinderMeshRef.current || nodeCount === 0) return;

    // Compute bounding center from first/last nodes (rough estimate)
    let cx = 0, cy = 0, cz = 0, n = 0;
    for (const [, node] of tree) {
      cx += node.x;
      cy += node.y;
      cz += node.z;
      n++;
      if (n > 100) break; // sample for performance
    }
    if (n === 0) return;
    cx /= n; cy /= n; cz /= n;

    const dist = camera.position.distanceTo(tmpVec.set(cx, cy, cz));
    let level = 0;
    if (dist > LOD_THRESHOLDS[1]) level = 2;
    else if (dist > LOD_THRESHOLDS[0]) level = 1;

    if (level !== currentLodRef.current) {
      currentLodRef.current = level;
      cylinderMeshRef.current.geometry = lodGeometries[level];
      invalidate();
    }
  });

  return (
    <group>
      {/* Sphere nodes */}
      <instancedMesh
        ref={sphereMeshRef}
        args={[sphereGeom, sharedMaterial, nodeCount]}
        frustumCulled={false}
        onPointerMove={(e) => {
          e.stopPropagation();
          if (e.instanceId !== undefined) {
            setHovered(mapping.instanceToNodeId[e.instanceId] ?? null);
          }
        }}
        onPointerLeave={() => setHovered(null)}
        onClick={(e) => {
          e.stopPropagation();
          if (e.instanceId !== undefined) {
            handleClick(e.instanceId, (e.nativeEvent as MouseEvent).shiftKey);
          }
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          if (e.instanceId !== undefined) {
            handleDoubleClick(e.instanceId);
          }
        }}
        onContextMenu={(e) => {
          e.stopPropagation();
          if (e.instanceId !== undefined) {
            const nodeId = mapping.instanceToNodeId[e.instanceId];
            if (nodeId !== undefined) {
              const nativeEvent = e.nativeEvent as MouseEvent;
              nativeEvent.preventDefault();
              window.dispatchEvent(
                new CustomEvent("neuron-context-menu", {
                  detail: { nodeId, x: nativeEvent.clientX, y: nativeEvent.clientY },
                }),
              );
            }
          }
        }}
      />

      {/* Cylinder edges */}
      {edgeCount > 0 && (
        <instancedMesh
          ref={cylinderMeshRef}
          args={[lodGeometries[0], sharedMaterial, edgeCount]}
          frustumCulled={false}
          onClick={(e) => {
            e.stopPropagation();
            if (e.instanceId !== undefined) {
              const childId = edgeMapping[e.instanceId];
              if (childId !== undefined) {
                const nodeIdx = mapping.nodeIdToInstance.get(childId);
                if (nodeIdx !== undefined) {
                  handleClick(nodeIdx, (e.nativeEvent as MouseEvent).shiftKey);
                }
              }
            }
          }}
        />
      )}
    </group>
  );
}
