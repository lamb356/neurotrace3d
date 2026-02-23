"use client";

import { useNeuronStore } from "@/store/useNeuronStore";

export default function MetadataPanel() {
  const metadata = useNeuronStore((s) => s.metadata);
  const source = useNeuronStore((s) => s.source);
  const neuromorphoMeta = useNeuronStore((s) => s.neuromorphoMeta);

  const entries: { label: string; value: string | undefined }[] = [];

  if (source === "neuromorpho" && neuromorphoMeta) {
    entries.push({ label: "Source", value: "NeuroMorpho.org" });
    entries.push({ label: "Archive", value: neuromorphoMeta.archive });
    entries.push({ label: "Species", value: neuromorphoMeta.species });
    entries.push({ label: "Scientific Name", value: neuromorphoMeta.scientific_name });
    if (neuromorphoMeta.brain_region?.length > 0) {
      entries.push({ label: "Brain Region", value: neuromorphoMeta.brain_region.join(", ") });
    }
    if (neuromorphoMeta.cell_type?.length > 0) {
      entries.push({ label: "Cell Type", value: neuromorphoMeta.cell_type.join(", ") });
    }
    entries.push({ label: "Stain", value: neuromorphoMeta.stain });
    entries.push({ label: "Physical Integrity", value: neuromorphoMeta.physical_Integrity });
  } else {
    entries.push({ label: "Source", value: metadata.originalSource });
    entries.push({ label: "Species", value: metadata.species });
    entries.push({ label: "Brain Region", value: metadata.brainRegion });
    entries.push({ label: "Cell Type", value: metadata.cellType });
  }

  const filtered = entries.filter((e) => e.value);
  if (filtered.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold uppercase tracking-wider">Metadata</h3>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        {filtered.map((e) => (
          <div key={e.label} className="contents">
            <dt className="text-text-muted">{e.label}</dt>
            <dd>{e.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
