"use client";

import { Canvas } from "@react-three/fiber";
import { useNeuronStore } from "@/store/useNeuronStore";
import NeuronRenderer from "./NeuronRenderer";
import CameraControls from "./CameraControls";
import NodeDragger from "./NodeDragger";
import ScreenshotHelper from "./ScreenshotHelper";
import MeasurementOverlay from "./MeasurementOverlay";

export default function NeuronCanvas() {
  const hasNodes = useNeuronStore((s) => s.tree.size > 0);
  const activeTool = useNeuronStore((s) => s.activeTool);
  const clearHover = useNeuronStore((s) => s.setHovered);

  return (
    <Canvas
      frameloop="demand"
      gl={{ preserveDrawingBuffer: true }}
      camera={{ fov: 50, near: 0.1, far: 100000 }}
      style={{ background: "var(--color-canvas-bg)" }}
      onPointerMissed={() => clearHover(null)}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 10]} intensity={0.8} />
      <CameraControls />
      <ScreenshotHelper />
      {hasNodes && <NeuronRenderer />}
      {hasNodes && activeTool === "move" && <NodeDragger />}
      {hasNodes && <MeasurementOverlay />}
    </Canvas>
  );
}
