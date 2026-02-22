"use client";

import { useEffect, useRef, useMemo } from "react";
import {
  InstancedMesh,
  SphereGeometry,
  MeshStandardMaterial,
  Matrix4,
  Color,
  BufferGeometry,
  Float32BufferAttribute,
  LineBasicMaterial,
  LineSegments,
} from "three";
import { useThree } from "@react-three/fiber";
import type { SWCParseResult } from "@neurotrace/swc-parser";
import { getTypeThreeColor } from "@/lib/colors";

interface NeuronRendererProps {
  data: SWCParseResult;
  hoveredId: number | null;
  selectedIds: Set<number>;
  onHover: (id: number | null) => void;
  onClick: (id: number, shiftKey: boolean) => void;
  onDoubleClick: (id: number) => void;
}

/** Maps instance indices ↔ node IDs for raycasting */
export interface InstanceMapping {
  instanceToNodeId: number[];
  nodeIdToInstance: Map<number, number>;
}

export function buildInstanceMapping(data: SWCParseResult): InstanceMapping {
  const instanceToNodeId: number[] = [];
  const nodeIdToInstance = new Map<number, number>();
  let idx = 0;
  for (const [id] of data.nodes) {
    instanceToNodeId[idx] = id;
    nodeIdToInstance.set(id, idx);
    idx++;
  }
  return { instanceToNodeId, nodeIdToInstance };
}

const tmpMatrix = new Matrix4();
const tmpColor = new Color();

export default function NeuronRenderer({
  data,
  hoveredId,
  selectedIds,
  onHover,
  onClick,
  onDoubleClick,
}: NeuronRendererProps) {
  const meshRef = useRef<InstancedMesh>(null);
  const linesRef = useRef<LineSegments>(null);
  const { invalidate } = useThree();

  const mapping = useMemo(() => buildInstanceMapping(data), [data]);
  const count = data.nodes.size;

  // Build InstancedMesh matrices and colors
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    let idx = 0;
    for (const [, node] of data.nodes) {
      const scale = Math.max(node.radius, 0.3);
      tmpMatrix.makeScale(scale, scale, scale);
      tmpMatrix.setPosition(node.x, node.y, node.z);
      mesh.setMatrixAt(idx, tmpMatrix);
      mesh.setColorAt(idx, getTypeThreeColor(node.type));
      idx++;
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    invalidate();
  }, [data, invalidate]);

  // Update highlight/selection colors
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    for (const [id, node] of data.nodes) {
      const idx = mapping.nodeIdToInstance.get(id);
      if (idx === undefined) continue;

      if (selectedIds.has(id)) {
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
  }, [data, hoveredId, selectedIds, mapping, invalidate]);

  // Build line segments geometry
  const linesGeometry = useMemo(() => {
    const edges: { px: number; py: number; pz: number; cx: number; cy: number; cz: number; pType: number; cType: number }[] = [];
    for (const [, node] of data.nodes) {
      if (node.parentId === -1) continue;
      const parent = data.nodes.get(node.parentId);
      if (!parent) continue;
      edges.push({
        px: parent.x, py: parent.y, pz: parent.z,
        cx: node.x, cy: node.y, cz: node.z,
        pType: parent.type, cType: node.type,
      });
    }

    const positions = new Float32Array(edges.length * 6);
    const colors = new Float32Array(edges.length * 6);
    for (let i = 0; i < edges.length; i++) {
      const e = edges[i];
      const off = i * 6;
      positions[off] = e.px;
      positions[off + 1] = e.py;
      positions[off + 2] = e.pz;
      positions[off + 3] = e.cx;
      positions[off + 4] = e.cy;
      positions[off + 5] = e.cz;

      const pc = getTypeThreeColor(e.pType);
      colors[off] = pc.r;
      colors[off + 1] = pc.g;
      colors[off + 2] = pc.b;
      const cc = getTypeThreeColor(e.cType);
      colors[off + 3] = cc.r;
      colors[off + 4] = cc.g;
      colors[off + 5] = cc.b;
    }

    const geom = new BufferGeometry();
    geom.setAttribute("position", new Float32BufferAttribute(positions, 3));
    geom.setAttribute("color", new Float32BufferAttribute(colors, 3));
    return geom;
  }, [data]);

  const sphereGeom = useMemo(() => new SphereGeometry(1, 8, 6), []);
  const material = useMemo(() => new MeshStandardMaterial({ toneMapped: false }), []);
  const lineMat = useMemo(() => new LineBasicMaterial({ vertexColors: true }), []);

  return (
    <group>
      <instancedMesh
        ref={meshRef}
        args={[sphereGeom, material, count]}
        frustumCulled={false}
        onPointerMove={(e) => {
          e.stopPropagation();
          if (e.instanceId !== undefined) {
            onHover(mapping.instanceToNodeId[e.instanceId] ?? null);
          }
        }}
        onPointerLeave={() => onHover(null)}
        onClick={(e) => {
          e.stopPropagation();
          if (e.instanceId !== undefined) {
            const nodeId = mapping.instanceToNodeId[e.instanceId];
            if (nodeId !== undefined) {
              onClick(nodeId, (e.nativeEvent as MouseEvent).shiftKey);
            }
          }
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          if (e.instanceId !== undefined) {
            const nodeId = mapping.instanceToNodeId[e.instanceId];
            if (nodeId !== undefined) onDoubleClick(nodeId);
          }
        }}
      />
      <primitive object={new LineSegments(linesGeometry, lineMat)} ref={linesRef} />
    </group>
  );
}
