"use client";

import { useEffect, useMemo } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { Vector2 } from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { N8AOPostPass } from "n8ao";
import { useNeuronStore } from "@/store/useNeuronStore";
import NeuronRenderer from "./NeuronRenderer";
import CameraControls from "./CameraControls";
import NodeDragger from "./NodeDragger";
import ScreenshotHelper from "./ScreenshotHelper";
import MeasurementOverlay from "./MeasurementOverlay";
import ShollSpheres from "./ShollSpheres";
import BoxSelector from "./BoxSelector";
import BranchExtender from "./BranchExtender";
import GhostNode from "./GhostNode";

const TOOL_CURSORS: Record<string, string> = {
  select: "default",
  "box-select": "crosshair",
  move: "move",
  insert: "cell",
  delete: "not-allowed",
  "measure-distance": "crosshair",
  "measure-angle": "crosshair",
  "path-select": "crosshair",
  extend: "cell",
};

/**
 * N8AO + Bloom via Three.js native EffectComposer.
 * Registering useFrame at priority 1 tells R3F to skip its default render,
 * so the EffectComposer is the sole renderer (no double-render overhead).
 */
function PostProcessingPipeline() {
  const { gl, scene, camera, size } = useThree();

  const composer = useMemo(() => {
    const c = new EffectComposer(gl);
    c.addPass(new RenderPass(scene, camera));

    const n8ao = new N8AOPostPass(scene, camera);
    n8ao.configuration.aoRadius = 5;
    n8ao.configuration.intensity = 4;
    n8ao.configuration.halfRes = true;
    n8ao.configuration.aoSamples = 8;
    n8ao.configuration.denoiseSamples = 4;
    c.addPass(n8ao);

    c.addPass(new UnrealBloomPass(new Vector2(1, 1), 0.35, 0.4, 0.82));
    c.addPass(new OutputPass());

    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, scene, camera]);

  // Resize render targets when viewport changes
  useEffect(() => {
    const dpr = gl.getPixelRatio();
    const w = Math.floor(size.width * dpr);
    const h = Math.floor(size.height * dpr);
    composer.setSize(w, h);
  }, [composer, gl, size]);

  // Dispose GPU resources on unmount
  useEffect(() => () => { composer.dispose(); }, [composer]);

  // Priority 1 → R3F skips default render, EffectComposer is sole renderer
  useFrame(() => { composer.render(); }, 1);

  return null;
}

export default function NeuronCanvas() {
  const hasNodes = useNeuronStore((s) => s.tree.size > 0);
  const activeTool = useNeuronStore((s) => s.activeTool);
  const clearHover = useNeuronStore((s) => s.setHovered);
  const postProcessing = useNeuronStore((s) => s.postProcessing);

  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 1.5]}
      gl={{ preserveDrawingBuffer: true, antialias: false }}
      style={{
        background: "var(--color-canvas-bg)",
        cursor: TOOL_CURSORS[activeTool] ?? "default",
      }}
      onPointerMissed={() => clearHover(null)}
    >
      {/* Lighting */}
      <ambientLight intensity={0.25} />
      <directionalLight position={[100, 100, 50]} intensity={1.4} />
      <directionalLight position={[-80, -60, -100]} intensity={0.35} color="#3a6aff" />
      <hemisphereLight args={["#1a3050", "#080810", 0.7]} />

      {/* Depth fog */}
      <fog attach="fog" args={["#070d1a", 600, 4000]} />

      <CameraControls />
      <ScreenshotHelper />
      {hasNodes && <NeuronRenderer />}
      {hasNodes && activeTool === "move" && <NodeDragger />}
      {hasNodes && activeTool === "box-select" && <BoxSelector />}
      {hasNodes && activeTool === "extend" && <BranchExtender />}
      {hasNodes && <MeasurementOverlay />}
      {hasNodes && <ShollSpheres />}
      {hasNodes && (activeTool === "insert" || activeTool === "extend") && <GhostNode />}

      {/* Post-processing: N8AO + Bloom (toggle via store) */}
      {postProcessing && <PostProcessingPipeline />}
    </Canvas>
  );
}
