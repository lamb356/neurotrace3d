import { useMemo } from "react";
import { useNeuronStore } from "@/store/useNeuronStore";
import type { SWCNode } from "@neurotrace/swc-parser";

/** Maximum number of sphere wireframes to render for performance */
const MAX_SPHERES = 50;

export default function ShollSpheres() {
  const tree = useNeuronStore((s) => s.tree);
  const roots = useNeuronStore((s) => s.roots);
  const showSpheres = useNeuronStore((s) => s.showShollSpheres);
  const radiusStep = useNeuronStore((s) => s.shollRadiusStep);

  const { center, radii } = useMemo(() => {
    if (!showSpheres || tree.size === 0) return { center: null, radii: [] };

    // Find soma
    let soma: SWCNode | undefined;
    for (const node of tree.values()) {
      if (node.type === 1) {
        soma = node;
        break;
      }
    }
    if (!soma && roots.length > 0) soma = tree.get(roots[0]);
    if (!soma) return { center: null, radii: [] };

    // Find max distance from soma
    const cx = soma.x;
    const cy = soma.y;
    const cz = soma.z;
    let maxDist = 0;
    for (const node of tree.values()) {
      const d = Math.sqrt((node.x - cx) ** 2 + (node.y - cy) ** 2 + (node.z - cz) ** 2);
      if (d > maxDist) maxDist = d;
    }

    // Generate radii, subsample if too many
    const allRadii: number[] = [];
    for (let r = radiusStep; r <= maxDist; r += radiusStep) {
      allRadii.push(r);
    }

    let selected = allRadii;
    if (allRadii.length > MAX_SPHERES) {
      const step = Math.ceil(allRadii.length / MAX_SPHERES);
      selected = allRadii.filter((_, i) => i % step === 0);
    }

    return { center: [cx, cy, cz] as [number, number, number], radii: selected };
  }, [tree, roots, showSpheres, radiusStep]);

  if (!showSpheres || !center || radii.length === 0) return null;

  return (
    <group position={center}>
      {radii.map((r) => (
        <mesh key={r}>
          <sphereGeometry args={[r, 24, 16]} />
          <meshBasicMaterial
            color="#60a5fa"
            wireframe
            transparent
            opacity={0.08}
          />
        </mesh>
      ))}
    </group>
  );
}
