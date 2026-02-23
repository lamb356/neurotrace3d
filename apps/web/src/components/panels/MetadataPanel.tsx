"use client";

import { useNeuronStore } from "@/store/useNeuronStore";

export default function MetadataPanel() {
  const metadata = useNeuronStore((s) => s.metadata);

  const entries = [
    { label: "Source", value: metadata.originalSource },
    { label: "Species", value: metadata.species },
    { label: "Brain Region", value: metadata.brainRegion },
    { label: "Cell Type", value: metadata.cellType },
  ].filter((e) => e.value);

  if (entries.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold uppercase tracking-wider">Metadata</h3>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        {entries.map((e) => (
          <div key={e.label} className="contents">
            <dt className="text-text-muted">{e.label}</dt>
            <dd>{e.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
