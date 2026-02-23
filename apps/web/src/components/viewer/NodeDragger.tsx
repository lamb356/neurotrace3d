"use client";

import { useRef, useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { Vector3, Plane, Raycaster, Vector2 } from "three";
import { useNeuronStore } from "@/store/useNeuronStore";

interface DragState {
  nodeId: number;
  originalPos: { x: number; y: number; z: number };
  plane: Plane;
}

/**
 * R3F component that handles drag-to-move on neuron nodes.
 * Only renders when Move tool is active (controlled by parent).
 */
export default function NodeDragger() {
  const { camera, gl, invalidate } = useThree();
  const dragRef = useRef<DragState | null>(null);
  const raycaster = useRef(new Raycaster());
  const mouse = useRef(new Vector2());

  useEffect(() => {
    const canvas = gl.domElement;

    const updateMouse = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      updateMouse(e);
      raycaster.current.setFromCamera(mouse.current, camera);

      const tree = useNeuronStore.getState().tree;
      const ray = raycaster.current.ray;
      let hitNodeId: number | null = null;
      let closestDist = Infinity;

      for (const [id, node] of tree) {
        const pos = new Vector3(node.x, node.y, node.z);
        const distToRay = ray.distanceToPoint(pos);
        const scale = Math.max(node.radius, 0.3);
        if (distToRay < scale) {
          const distToOrigin = ray.origin.distanceTo(pos);
          if (distToOrigin < closestDist) {
            closestDist = distToOrigin;
            hitNodeId = id;
          }
        }
      }

      if (hitNodeId === null) return;

      const node = tree.get(hitNodeId);
      if (!node) return;

      const startPos = new Vector3(node.x, node.y, node.z);
      const cameraDir = new Vector3();
      camera.getWorldDirection(cameraDir);
      const plane = new Plane().setFromNormalAndCoplanarPoint(
        cameraDir.negate(),
        startPos,
      );

      dragRef.current = {
        nodeId: hitNodeId,
        originalPos: { x: node.x, y: node.y, z: node.z },
        plane,
      };

      useNeuronStore.getState().selectNode(hitNodeId);
      canvas.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragRef.current) return;
      updateMouse(e);
      raycaster.current.setFromCamera(mouse.current, camera);
      // Visual feedback happens via the final move on pointer up
      invalidate();
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!dragRef.current) return;
      updateMouse(e);
      raycaster.current.setFromCamera(mouse.current, camera);

      const intersection = new Vector3();
      if (raycaster.current.ray.intersectPlane(dragRef.current.plane, intersection)) {
        const { nodeId } = dragRef.current;
        useNeuronStore.getState().moveNode(nodeId, intersection.x, intersection.y, intersection.z);
      }

      canvas.releasePointerCapture(e.pointerId);
      dragRef.current = null;
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);

    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
    };
  }, [camera, gl, invalidate]);

  return null;
}
