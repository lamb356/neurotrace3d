"use client";

import { useRef, useEffect, type ElementRef } from "react";
import { OrbitControls } from "@react-three/drei";
import { useThree, useFrame } from "@react-three/fiber";
import { Vector3, Box3 } from "three";
import { useNeuronStore } from "@/store/useNeuronStore";

export default function CameraControls() {
  const tree = useNeuronStore((s) => s.tree);
  const focusTarget = useNeuronStore((s) => s.focusTarget);
  const clearFocusTarget = useNeuronStore((s) => s.clearFocusTarget);

  const controlsRef = useRef<ElementRef<typeof OrbitControls>>(null);
  const { camera, invalidate } = useThree();
  const lerpTarget = useRef<Vector3 | null>(null);
  const lerpProgress = useRef(0);

  // Auto-fit camera to neuron bounding box on data load
  useEffect(() => {
    if (tree.size === 0 || !controlsRef.current) return;

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
    const maxExtent = Math.max(size.x, size.y, size.z);
    const distance = maxExtent * 1.5;

    camera.position.set(center.x, center.y, center.z + distance);
    camera.lookAt(center);
    controlsRef.current.target.copy(center);
    controlsRef.current.update();
    invalidate();
  }, [tree, camera, invalidate]);

  // Handle smooth focus on double-click target
  useEffect(() => {
    if (focusTarget) {
      lerpTarget.current = new Vector3(focusTarget.x, focusTarget.y, focusTarget.z);
      lerpProgress.current = 0;
    }
  }, [focusTarget]);

  useFrame(() => {
    if (!lerpTarget.current || !controlsRef.current) return;
    lerpProgress.current += 0.05;
    if (lerpProgress.current >= 1) {
      controlsRef.current.target.copy(lerpTarget.current);
      lerpTarget.current = null;
      clearFocusTarget();
    } else {
      controlsRef.current.target.lerp(lerpTarget.current, 0.1);
    }
    controlsRef.current.update();
    invalidate();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.1}
      makeDefault
      onChange={() => invalidate()}
    />
  );
}
