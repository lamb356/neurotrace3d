"use client";

import { Canvas } from "@react-three/fiber";
import { useNeuronStore } from "@/store/useNeuronStore";
import NeuronRenderer from "./NeuronRenderer";
import CameraControls from "./CameraControls";

export default function NeuronCanvas() {
  const hasNodes = useNeuronStore((s) => s.tree.size > 0);
  const clearHover = useNeuronStore((s) => s.setHovered);

  return (
    <Canvas
      frameloop="demand"
      camera={{ fov: 50, near: 0.1, far: 100000 }}
      style={{ background: "#0a0a0a" }}
      onPointerMissed={() => clearHover(null)}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 10]} intensity={0.8} />
      <CameraControls />
      {hasNodes && <NeuronRenderer />}
    </Canvas>
  );
}
