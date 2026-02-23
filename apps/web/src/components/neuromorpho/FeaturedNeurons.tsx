"use client";

import { useState, useCallback } from "react";
import { FEATURED_NEURONS } from "@/lib/featured-neurons";
import { useNeuronStore } from "@/store/useNeuronStore";

export default function FeaturedNeurons() {
  const [loadingName, setLoadingName] = useState<string | null>(null);

  const handleClick = useCallback(async (name: string) => {
    setLoadingName(name);
    await useNeuronStore.getState().loadFromNeuromorpho(name);
    setLoadingName(null);
  }, []);

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-text-muted text-sm">or browse NeuroMorpho.org</p>
      <div className="grid w-full max-w-md grid-cols-2 gap-3">
        {FEATURED_NEURONS.map((n) => (
          <button
            key={n.name}
            className="border-border bg-surface hover:bg-surface-hover flex flex-col items-start rounded-lg border px-4 py-3 text-left transition-colors disabled:opacity-50"
            onClick={() => handleClick(n.name)}
            disabled={loadingName !== null}
          >
            <span className="text-sm font-semibold">
              {loadingName === n.name ? (
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
                  Loading...
                </span>
              ) : (
                n.label
              )}
            </span>
            <span className="text-text-muted text-xs">
              {n.species} &middot; {n.region}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
