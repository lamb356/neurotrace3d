"use client";

import type { NeuromorphoNeuron } from "@/lib/neuromorpho-types";

interface NeuronCardProps {
  neuron: NeuromorphoNeuron;
  onLoad: (name: string) => void;
  loading: boolean;
}

export default function NeuronCard({ neuron, onLoad, loading }: NeuronCardProps) {
  const region = neuron.brain_region?.[0] ?? "";
  const cellType = neuron.cell_type?.[0] ?? "";
  const details = [neuron.species, region, cellType].filter(Boolean).join(" \u00b7 ");

  return (
    <div className="border-border bg-surface flex items-center justify-between rounded-lg border px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{neuron.neuron_name}</p>
        {details && (
          <p className="text-text-muted truncate text-xs">{details}</p>
        )}
      </div>
      <button
        className="bg-accent hover:bg-accent-hover ml-3 shrink-0 rounded px-3 py-1 text-xs font-medium text-white transition-colors disabled:opacity-50"
        onClick={() => onLoad(neuron.neuron_name)}
        disabled={loading}
      >
        {loading ? (
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        ) : (
          "Load"
        )}
      </button>
    </div>
  );
}
