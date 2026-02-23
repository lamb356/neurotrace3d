"use client";

import { useRef, useEffect, useMemo } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrthographicCamera } from "@react-three/drei";
import {
  Box3,
  Vector3,
  BufferGeometry,
  Float32BufferAttribute,
  LineBasicMaterial,
  LineSegments,
  OrthographicCamera as ThreeOrthographicCamera,
  Matrix4,
} from "three";
import { useNeuronStore } from "@/store/useNeuronStore";
import { mainCameraRef } from "@/lib/mainCameraRef";
import NeuronRenderer from "./NeuronRenderer";

const MINIMAP_SIZE = 200;

/** Listens for main camera changes and invalidates the minimap canvas */
function MinimapInvalidator() {
  const { invalidate } = useThree();
  useEffect(() => {
    const handler = () => invalidate();
    window.addEventListener("main-camera-moved", handler);
    return () => window.removeEventListener("main-camera-moved", handler);
  }, [invalidate]);
  return null;
}

/** Auto-fits an orthographic camera to the full bounding box */
function MinimapCamera() {
  const tree = useNeuronStore((s) => s.tree);
  const camRef = useRef<ThreeOrthographicCamera>(null);
  const { invalidate } = useThree();

  useEffect(() => {
    if (tree.size === 0 || !camRef.current) return;
    const box = new Box3();
    const v = new Vector3();
    for (const [, node] of tree) {
      v.set(node.x, node.y, node.z);
      box.expandByPoint(v);
    }
    const center = new Vector3();
    box.getCenter(center);
    const size = new Vector3();
    box.getSize(size);
    const maxExtent = Math.max(size.x, size.y, size.z) * 0.7;

    const cam = camRef.current;
    cam.left = -maxExtent;
    cam.right = maxExtent;
    cam.top = maxExtent;
    cam.bottom = -maxExtent;
    cam.position.set(center.x, center.y, center.z + maxExtent * 2);
    cam.lookAt(center);
    cam.updateProjectionMatrix();
    invalidate();
  }, [tree, invalidate]);

  return (
    <OrthographicCamera
      ref={camRef}
      makeDefault
      near={0.1}
      far={100000}
    />
  );
}

/** Draws a wireframe frustum showing the main camera's view */
function FrustumIndicator() {
  const linesRef = useRef<LineSegments>(null);
  const geomRef = useRef<BufferGeometry>(null);

  const geometry = useMemo(() => {
    // 12 edges of a frustum = 24 vertices
    const geom = new BufferGeometry();
    geom.setAttribute("position", new Float32BufferAttribute(new Float32Array(24 * 3), 3));
    return geom;
  }, []);

  const material = useMemo(
    () => new LineBasicMaterial({ color: 0xffffff, opacity: 0.5, transparent: true }),
    [],
  );

  useFrame(() => {
    const mainCam = mainCameraRef.current;
    if (!mainCam || !geometry) return;

    // Compute the 8 frustum corners in world space
    // NDC corners: (+-1, +-1, +-1) -> unproject
    const invProjView = new Matrix4()
      .multiplyMatrices(mainCam.projectionMatrix, mainCam.matrixWorldInverse)
      .invert();

    const corners: Vector3[] = [];
    for (const z of [-1, 1]) {
      for (const y of [-1, 1]) {
        for (const x of [-1, 1]) {
          const v = new Vector3(x, y, z).applyMatrix4(invProjView);
          corners.push(v);
        }
      }
    }

    // Edges: 4 near edges, 4 far edges, 4 connecting edges
    // Near face (z=-1): corners 0-3, Far face (z=1): corners 4-7
    // Corner layout per face: 0=(-1,-1), 1=(1,-1), 2=(-1,1), 3=(1,1)
    const edges = [
      // Near face
      [0, 1], [0, 2], [1, 3], [2, 3],
      // Far face
      [4, 5], [4, 6], [5, 7], [6, 7],
      // Connecting
      [0, 4], [1, 5], [2, 6], [3, 7],
    ];

    const positions = geometry.attributes.position as Float32BufferAttribute;
    let idx = 0;
    for (const [a, b] of edges) {
      positions.setXYZ(idx++, corners[a].x, corners[a].y, corners[a].z);
      positions.setXYZ(idx++, corners[b].x, corners[b].y, corners[b].z);
    }
    positions.needsUpdate = true;
  });

  return (
    <primitive
      object={new LineSegments(geometry, material)}
      ref={linesRef}
    />
  );
}

export default function Minimap() {
  const hasNodes = useNeuronStore((s) => s.tree.size > 0);
  const showMinimap = useNeuronStore((s) => s.showMinimap);

  if (!hasNodes || !showMinimap) return null;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 12,
        left: 12,
        width: MINIMAP_SIZE,
        height: MINIMAP_SIZE,
        border: "1px solid var(--color-border)",
        borderRadius: 8,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 10,
        background: "var(--color-canvas-bg)",
      }}
    >
      <Canvas frameloop="demand" gl={{ alpha: true }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 10]} intensity={0.8} />
        <MinimapCamera />
        <NeuronRenderer />
        <FrustumIndicator />
        <MinimapInvalidator />
      </Canvas>
    </div>
  );
}
