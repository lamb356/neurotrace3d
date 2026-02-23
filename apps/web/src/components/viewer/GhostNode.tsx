"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3, Plane, Raycaster, Vector2, Mesh } from "three";
import { useNeuronStore } from "@/store/useNeuronStore";

/**
 * Translucent cyan sphere that follows the mouse position in 3D space.
 * Visible when activeTool is "insert" or "extend".
 */
export default function GhostNode() {
  const meshRef = useRef<Mesh>(null);
  const { camera, gl } = useThree();
  const raycaster = useRef(new Raycaster());
  const mouse = useRef(new Vector2());
  const worldPos = useRef(new Vector3());

  useFrame(() => {
    if (!meshRef.current) return;

    const canvas = gl.domElement;
    const rect = canvas.getBoundingClientRect();

    // Use last known mouse position from pointermove event
    const onMove = (e: PointerEvent) => {
      mouse.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };
    canvas.addEventListener("pointermove", onMove, { once: true });

    // Raycast against a plane at origin facing camera
    raycaster.current.setFromCamera(mouse.current, camera);
    const cameraDir = new Vector3();
    camera.getWorldDirection(cameraDir);

    // Use extendingFrom node position as plane anchor if available
    const store = useNeuronStore.getState();
    let planePoint = new Vector3(0, 0, 0);
    if (store.extendingFrom !== null) {
      const fromNode = store.tree.get(store.extendingFrom);
      if (fromNode) {
        planePoint.set(fromNode.x, fromNode.y, fromNode.z);
      }
    } else if (store.selection.size === 1) {
      const selId = store.selection.values().next().value!;
      const selNode = store.tree.get(selId);
      if (selNode) {
        planePoint.set(selNode.x, selNode.y, selNode.z);
      }
    }

    const plane = new Plane().setFromNormalAndCoplanarPoint(
      cameraDir.negate(),
      planePoint,
    );

    if (raycaster.current.ray.intersectPlane(plane, worldPos.current)) {
      meshRef.current.position.copy(worldPos.current);
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1.5, 16, 12]} />
      <meshBasicMaterial
        color="#00e5ff"
        transparent
        opacity={0.55}
        depthWrite={false}
      />
    </mesh>
  );
}
