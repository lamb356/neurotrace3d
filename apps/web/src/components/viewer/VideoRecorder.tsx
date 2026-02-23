"use client";

import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { CatmullRomCurve3 } from "three";
import { useNeuronStore } from "@/store/useNeuronStore";
import {
  computeBoundsFromTree,
  findSomaPosition,
  findLongestPath,
  computeCameraFrame,
  RESOLUTION_MAP,
} from "@/lib/videoExport";
import type { VideoExportConfig } from "@/lib/videoExport";

/**
 * R3F component that handles video recording.
 * Lives inside <Canvas> to access gl, scene, camera via useThree().
 * Listens for window events to start/cancel recording.
 */
export default function VideoRecorder() {
  const { gl, scene, camera } = useThree();
  const recordingRef = useRef(false);
  const cancelRef = useRef(false);

  useEffect(() => {
    function handleStart(e: Event) {
      const config = (e as CustomEvent<VideoExportConfig>).detail;
      if (recordingRef.current) return;
      startRecording(config);
    }

    function handleCancel() {
      cancelRef.current = true;
    }

    window.addEventListener("start-video-capture", handleStart);
    window.addEventListener("cancel-video-capture", handleCancel);
    return () => {
      window.removeEventListener("start-video-capture", handleStart);
      window.removeEventListener("cancel-video-capture", handleCancel);
    };
  });

  async function startRecording(config: VideoExportConfig) {
    recordingRef.current = true;
    cancelRef.current = false;

    const { strategy, duration, fps, resolution } = config;
    const { width: targetW, height: targetH } = RESOLUTION_MAP[resolution];
    const totalFrames = Math.round(duration * fps);

    // Save original state
    const origWidth = gl.domElement.width;
    const origHeight = gl.domElement.height;
    const origPixelRatio = gl.getPixelRatio();
    const origCamPos = camera.position.clone();
    const origCamUp = camera.up.clone();
    const origCamTarget = camera.getWorldDirection(camera.position.clone()); // save for restore

    // Prepare animation data
    const store = useNeuronStore.getState();
    const { center, maxExtent } = computeBoundsFromTree(store.tree);
    const somaPos = findSomaPosition(store.tree, store.roots);

    let pathCurve: CatmullRomCurve3 | null = null;
    if (strategy === "fly-along") {
      const path = findLongestPath(store.tree, store.childIndex, store.roots);
      if (path.length >= 2) {
        pathCurve = new CatmullRomCurve3(path, false, "catmullrom", 0.5);
      }
    }

    // Resize renderer for target resolution
    gl.setPixelRatio(1);
    gl.setSize(targetW, targetH, false);

    // Update camera aspect
    if ("aspect" in camera) {
      (camera as unknown as { aspect: number }).aspect = targetW / targetH;
    }
    if ("updateProjectionMatrix" in camera) {
      (camera as unknown as { updateProjectionMatrix: () => void }).updateProjectionMatrix();
    }

    // Set up MediaRecorder
    const canvas = gl.domElement;
    const stream = canvas.captureStream(0);

    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";

    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    const recordingDone = new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        resolve(new Blob(chunks, { type: mimeType }));
      };
    });

    recorder.start();

    // Get captureStream track for requestFrame
    const videoTrack = stream.getVideoTracks()[0] as MediaStreamTrack & { requestFrame?: () => void };

    // Frame loop
    for (let frame = 0; frame < totalFrames; frame++) {
      if (cancelRef.current) break;

      const t = frame / totalFrames;
      const { position, lookAt, up } = computeCameraFrame(t, strategy, center, maxExtent, somaPos, pathCurve);

      camera.position.copy(position);
      camera.up.copy(up);
      camera.lookAt(lookAt);
      camera.updateMatrixWorld();

      if ("updateProjectionMatrix" in camera) {
        (camera as unknown as { updateProjectionMatrix: () => void }).updateProjectionMatrix();
      }

      gl.render(scene, camera);

      // Request a new frame from the captureStream
      if (videoTrack.requestFrame) {
        videoTrack.requestFrame();
      }

      // Dispatch progress
      window.dispatchEvent(
        new CustomEvent("video-capture-progress", {
          detail: { frame, totalFrames, progress: (frame + 1) / totalFrames },
        }),
      );

      // Yield to allow the browser to process
      await new Promise((r) => setTimeout(r, 0));
    }

    recorder.stop();
    const blob = await recordingDone;

    // Restore original state
    gl.setPixelRatio(origPixelRatio);
    gl.setSize(origWidth, origHeight, false);
    camera.position.copy(origCamPos);
    camera.up.copy(origCamUp);

    if ("aspect" in camera) {
      (camera as unknown as { aspect: number }).aspect = origWidth / origHeight;
    }
    if ("updateProjectionMatrix" in camera) {
      (camera as unknown as { updateProjectionMatrix: () => void }).updateProjectionMatrix();
    }

    gl.render(scene, camera);

    recordingRef.current = false;

    if (cancelRef.current) {
      window.dispatchEvent(new CustomEvent("video-capture-cancelled"));
    } else {
      window.dispatchEvent(new CustomEvent("video-capture-complete", { detail: { blob } }));
    }
  }

  return null;
}
