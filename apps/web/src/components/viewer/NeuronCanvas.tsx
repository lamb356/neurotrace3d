"use client";

import { Canvas } from "@react-three/fiber";
import { EffectComposer, SSAO, Bloom, SMAA } from "@react-three/postprocessing";
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

      {/* Post-processing: off / low (Bloom+SMAA) / high (SSAO+Bloom+SMAA) */}
      {postProcessing === "low" && (
        <EffectComposer multisampling={0}>
          <Bloom intensity={0.35} luminanceThreshold={0.82} />
          <SMAA />
        </EffectComposer>
      )}
      {postProcessing === "high" && (
        <EffectComposer multisampling={0}>
          <SSAO samples={12} radius={3} intensity={15} />
          <Bloom intensity={0.35} luminanceThreshold={0.82} />
          <SMAA />
        </EffectComposer>
      )}
    </Canvas>
  );
}
