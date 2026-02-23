"use client";

import { Line, Html } from "@react-three/drei";
import { useNeuronStore } from "@/store/useNeuronStore";
import type { Measurement } from "@/store/types";
import type { SWCNode } from "@neurotrace/swc-parser";

export default function MeasurementOverlay() {
  const tree = useNeuronStore((s) => s.tree);
  const measurements = useNeuronStore((s) => s.measurements);
  const pending = useNeuronStore((s) => s.measurePending);

  if (measurements.length === 0 && pending.length === 0) return null;

  return (
    <group>
      {measurements.map((m, i) => (
        <MeasurementViz key={i} measurement={m} tree={tree} />
      ))}
      {pending.map((id) => {
        const node = tree.get(id);
        if (!node) return null;
        return (
          <mesh key={`pending-${id}`} position={[node.x, node.y, node.z]}>
            <sphereGeometry args={[Math.max(node.radius, 0.5) * 1.5, 16, 12]} />
            <meshBasicMaterial color="#f39c12" transparent opacity={0.5} />
          </mesh>
        );
      })}
    </group>
  );
}

function MeasurementViz({
  measurement,
  tree,
}: {
  measurement: Measurement;
  tree: Map<number, SWCNode>;
}) {
  if (measurement.kind === "distance") {
    const a = tree.get(measurement.nodeA);
    const b = tree.get(measurement.nodeB);
    if (!a || !b) return null;
    const mid: [number, number, number] = [
      (a.x + b.x) / 2,
      (a.y + b.y) / 2,
      (a.z + b.z) / 2,
    ];
    return (
      <group>
        <Line
          points={[
            [a.x, a.y, a.z],
            [b.x, b.y, b.z],
          ]}
          color="#f39c12"
          lineWidth={2}
          dashed
          dashSize={2}
          gapSize={1}
        />
        <Html position={mid} center style={{ pointerEvents: "none" }}>
          <div
            style={{
              background: "rgba(0,0,0,0.8)",
              color: "#f39c12",
              padding: "2px 6px",
              borderRadius: 4,
              fontSize: 11,
              whiteSpace: "nowrap",
            }}
          >
            {measurement.euclidean.toFixed(1)} µm
            {measurement.path !== null &&
              ` | path: ${measurement.path.toFixed(1)} µm`}
          </div>
        </Html>
      </group>
    );
  }

  if (measurement.kind === "angle") {
    const a = tree.get(measurement.nodeA);
    const b = tree.get(measurement.nodeB);
    const c = tree.get(measurement.nodeC);
    if (!a || !b || !c) return null;
    return (
      <group>
        <Line
          points={[
            [a.x, a.y, a.z],
            [b.x, b.y, b.z],
          ]}
          color="#e74c3c"
          lineWidth={2}
        />
        <Line
          points={[
            [b.x, b.y, b.z],
            [c.x, c.y, c.z],
          ]}
          color="#e74c3c"
          lineWidth={2}
        />
        <Html
          position={[b.x, b.y, b.z]}
          center
          style={{ pointerEvents: "none" }}
        >
          <div
            style={{
              background: "rgba(0,0,0,0.8)",
              color: "#e74c3c",
              padding: "2px 6px",
              borderRadius: 4,
              fontSize: 11,
              whiteSpace: "nowrap",
            }}
          >
            {measurement.degrees.toFixed(1)}°
          </div>
        </Html>
      </group>
    );
  }

  return null;
}
