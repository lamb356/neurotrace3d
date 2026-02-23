"use client";

import { useRef, useEffect, useMemo, type ElementRef } from "react";
import {
  OrbitControls,
  PerspectiveCamera,
  OrthographicCamera,
} from "@react-three/drei";
import { useThree, useFrame } from "@react-three/fiber";
import { Vector3, Box3 } from "three";
import { useNeuronStore } from "@/store/useNeuronStore";
import { mainCameraRef } from "@/lib/mainCameraRef";

export default function CameraControls() {
  const tree = useNeuronStore((s) => s.tree);
  const focusTarget = useNeuronStore((s) => s.focusTarget);
  const clearFocusTarget = useNeuronStore((s) => s.clearFocusTarget);
  const cameraMode = useNeuronStore((s) => s.cameraMode);

  const controlsRef = useRef<ElementRef<typeof OrbitControls>>(null);
  const { camera, invalidate, size } = useThree();

  // Lerp refs for smooth transitions
  const lerpTarget = useRef<Vector3 | null>(null);
  const lerpCameraPos = useRef<Vector3 | null>(null);
  const lerpCameraUp = useRef<Vector3 | null>(null);
  const lerpProgress = useRef(0);

  const isPerspective = cameraMode === "perspective";

  // Expose main camera for minimap
  useEffect(() => {
    mainCameraRef.current = camera;
    return () => { mainCameraRef.current = null; };
  }, [camera]);

  // Compute bounding box from tree
  const bbox = useMemo(() => {
    if (tree.size === 0) return null;
    const box = new Box3();
    const v = new Vector3();
    for (const [, node] of tree) {
      v.set(node.x, node.y, node.z);
      box.expandByPoint(v);
    }
    return box;
  }, [tree]);

  const bboxCenter = useMemo(() => {
    if (!bbox) return new Vector3();
    const c = new Vector3();
    bbox.getCenter(c);
    return c;
  }, [bbox]);

  const bboxMaxExtent = useMemo(() => {
    if (!bbox) return 100;
    const s = new Vector3();
    bbox.getSize(s);
    return Math.max(s.x, s.y, s.z);
  }, [bbox]);

  // Ortho frustum size
  const orthoHalfSize = bboxMaxExtent * 0.6;
  const aspect = size.width / size.height;

  // Auto-fit camera to bounding box on data load
  useEffect(() => {
    if (!bbox || !controlsRef.current) return;
    const distance = bboxMaxExtent * 1.5;

    camera.position.set(bboxCenter.x, bboxCenter.y, bboxCenter.z + distance);
    camera.lookAt(bboxCenter);
    camera.up.set(0, 1, 0);
    controlsRef.current.target.copy(bboxCenter);
    controlsRef.current.update();
    invalidate();
  }, [tree, camera, invalidate, bbox, bboxCenter, bboxMaxExtent]);

  // Handle camera mode switch — animate to axis-aligned position
  const prevMode = useRef(cameraMode);
  useEffect(() => {
    if (cameraMode === prevMode.current) return;
    prevMode.current = cameraMode;
    if (!bbox || !controlsRef.current) return;

    if (cameraMode === "perspective") {
      // Switching back to perspective — just keep current position
      return;
    }

    const dist = bboxMaxExtent * 2;
    let targetPos: Vector3;
    let up: Vector3;

    switch (cameraMode) {
      case "ortho-xy":
        targetPos = new Vector3(bboxCenter.x, bboxCenter.y, bboxCenter.z + dist);
        up = new Vector3(0, 1, 0);
        break;
      case "ortho-xz":
        targetPos = new Vector3(bboxCenter.x, bboxCenter.y + dist, bboxCenter.z);
        up = new Vector3(0, 0, -1);
        break;
      case "ortho-yz":
        targetPos = new Vector3(bboxCenter.x + dist, bboxCenter.y, bboxCenter.z);
        up = new Vector3(0, 1, 0);
        break;
      default:
        return;
    }

    lerpTarget.current = bboxCenter.clone();
    lerpCameraPos.current = targetPos;
    lerpCameraUp.current = up;
    lerpProgress.current = 0;
  }, [cameraMode, bbox, bboxCenter, bboxMaxExtent]);

  // Handle smooth focus on double-click target
  useEffect(() => {
    if (focusTarget) {
      lerpTarget.current = new Vector3(focusTarget.x, focusTarget.y, focusTarget.z);
      lerpCameraPos.current = null; // Don't move camera position for focus
      lerpCameraUp.current = null;
      lerpProgress.current = 0;
    }
  }, [focusTarget]);

  useFrame(() => {
    if (!controlsRef.current) return;
    const hasTargetLerp = lerpTarget.current !== null;
    const hasPosLerp = lerpCameraPos.current !== null;

    if (!hasTargetLerp && !hasPosLerp) return;

    lerpProgress.current += 0.05;
    const done = lerpProgress.current >= 1;
    const t = Math.min(lerpProgress.current, 1);
    // Smooth ease-out
    const ease = 1 - Math.pow(1 - t, 3);

    if (hasTargetLerp) {
      if (done) {
        controlsRef.current.target.copy(lerpTarget.current!);
      } else {
        controlsRef.current.target.lerp(lerpTarget.current!, ease * 0.3 + 0.05);
      }
    }

    if (hasPosLerp) {
      if (done) {
        camera.position.copy(lerpCameraPos.current!);
      } else {
        camera.position.lerp(lerpCameraPos.current!, ease * 0.3 + 0.05);
      }
    }

    if (lerpCameraUp.current) {
      if (done) {
        camera.up.copy(lerpCameraUp.current);
      } else {
        camera.up.lerp(lerpCameraUp.current, ease * 0.3 + 0.05);
      }
      camera.up.normalize();
    }

    if (done) {
      lerpTarget.current = null;
      lerpCameraPos.current = null;
      lerpCameraUp.current = null;
      clearFocusTarget();
    }

    controlsRef.current.update();
    invalidate();
  });

  return (
    <>
      <PerspectiveCamera
        makeDefault={isPerspective}
        fov={50}
        near={0.1}
        far={100000}
      />
      <OrthographicCamera
        makeDefault={!isPerspective}
        near={-100000}
        far={100000}
        left={-orthoHalfSize * aspect}
        right={orthoHalfSize * aspect}
        top={orthoHalfSize}
        bottom={-orthoHalfSize}
      />
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.1}
        makeDefault
        enableRotate={isPerspective}
        onChange={() => {
          invalidate();
          window.dispatchEvent(new Event("main-camera-moved"));
        }}
      />
    </>
  );
}
