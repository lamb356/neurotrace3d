"use client";

import { Canvas } from "@react-three/fiber";
import { Vector3 } from "three";
import type { SWCParseResult } from "@neurotrace/swc-parser";
import NeuronRenderer from "./NeuronRenderer";
import CameraControls from "./CameraControls";

interface NeuronCanvasProps {
  data: SWCParseResult | null;
  hoveredId: number | null;
  selectedIds: Set<number>;
  focusTarget: Vector3 | null;
  onHover: (id: number | null) => void;
  onClick: (id: number, shiftKey: boolean) => void;
  onDoubleClick: (id: number) => void;
  onFocusDone: () => void;
}

export default function NeuronCanvas({
  data,
  hoveredId,
  selectedIds,
  focusTarget,
  onHover,
  onClick,
  onDoubleClick,
  onFocusDone,
}: NeuronCanvasProps) {
  return (
    <Canvas
      frameloop="demand"
      camera={{ fov: 50, near: 0.1, far: 100000 }}
      style={{ background: "#0a0a0a" }}
      onPointerMissed={() => onHover(null)}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 10]} intensity={0.8} />
      <CameraControls data={data} focusTarget={focusTarget} onFocusDone={onFocusDone} />
      {data && data.nodes.size > 0 && (
        <NeuronRenderer
          data={data}
          hoveredId={hoveredId}
          selectedIds={selectedIds}
          onHover={onHover}
          onClick={onClick}
          onDoubleClick={onDoubleClick}
        />
      )}
    </Canvas>
  );
}
