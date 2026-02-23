"use client";

import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { Vector3, Plane, Raycaster, Vector2 } from "three";
import { useNeuronStore } from "@/store/useNeuronStore";

/**
 * R3F behavior-only component for extending branches.
 * Click a tip node to start, click in empty 3D space to place successive child nodes.
 * Escape or double-click to finish.
 */
export default function BranchExtender() {
  const { camera, gl } = useThree();
  const raycaster = useRef(new Raycaster());
  const mouse = useRef(new Vector2());

  useEffect(() => {
    const canvas = gl.domElement;

    const updateMouse = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const hitTestNode = (): number | null => {
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
      return hitNodeId;
    };

    const onClick = (e: MouseEvent) => {
      if (e.button !== 0) return;
      updateMouse(e);

      const store = useNeuronStore.getState();
      const hitId = hitTestNode();

      if (store.extendingFrom === null) {
        // Not extending yet — check if we clicked a tip node
        if (hitId !== null) {
          const children = store.childIndex.get(hitId) ?? [];
          if (children.length === 0) {
            store.startExtend(hitId);
          }
        }
      } else {
        // Already extending — if we clicked a node, ignore (don't place on top of nodes)
        if (hitId !== null) return;

        // Place new node on camera-facing plane at the extending node's position
        const fromNode = store.tree.get(store.extendingFrom);
        if (!fromNode) return;

        const fromPos = new Vector3(fromNode.x, fromNode.y, fromNode.z);
        const cameraDir = new Vector3();
        camera.getWorldDirection(cameraDir);
        const plane = new Plane().setFromNormalAndCoplanarPoint(
          cameraDir.negate(),
          fromPos,
        );

        raycaster.current.setFromCamera(mouse.current, camera);
        const intersection = new Vector3();
        if (raycaster.current.ray.intersectPlane(plane, intersection)) {
          store.placeExtendNode({
            x: intersection.x,
            y: intersection.y,
            z: intersection.z,
          });
        }
      }
    };

    const onDblClick = () => {
      useNeuronStore.getState().stopExtend();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        useNeuronStore.getState().stopExtend();
      }
    };

    canvas.addEventListener("click", onClick);
    canvas.addEventListener("dblclick", onDblClick);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      canvas.removeEventListener("click", onClick);
      canvas.removeEventListener("dblclick", onDblClick);
      window.removeEventListener("keydown", onKeyDown);
      // Clean up extend state when component unmounts (tool switched)
      useNeuronStore.getState().stopExtend();
    };
  }, [camera, gl]);

  return null;
}
