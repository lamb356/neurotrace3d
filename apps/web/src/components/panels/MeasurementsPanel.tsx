"use client";

import { useState } from "react";
import { useNeuronStore } from "@/store/useNeuronStore";

export default function MeasurementsPanel() {
  const measurements = useNeuronStore((s) => s.measurements);
  const [expanded, setExpanded] = useState(true);

  if (measurements.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <button
          className="flex flex-1 items-center gap-2 text-left text-sm font-semibold uppercase tracking-wider"
          onClick={() => setExpanded(!expanded)}
        >
          Measurements ({measurements.length})
          <span className="text-text-muted text-xs">
            {expanded ? "\u25b2" : "\u25bc"}
          </span>
        </button>
        <button
          className="text-xs text-red-400 hover:text-red-300"
          onClick={() => useNeuronStore.getState().clearMeasurements()}
        >
          Clear All
        </button>
      </div>
      {expanded && (
        <ul className="flex max-h-60 flex-col gap-1.5 overflow-y-auto">
          {measurements.map((m, i) => (
            <li
              key={i}
              className="bg-bg border-border flex items-start justify-between gap-2 rounded border px-3 py-2 text-xs"
            >
              <div>
                {m.kind === "distance" ? (
                  <>
                    <span className="font-mono text-amber-400">Distance</span>
                    <span className="text-text-muted ml-1">
                      #{m.nodeA} → #{m.nodeB}
                    </span>
                    <p className="text-text numeric mt-0.5">
                      Euclidean: {m.euclidean.toFixed(2)} µm
                      {m.path !== null && (
                        <> | Path: {m.path.toFixed(2)} µm</>
                      )}
                    </p>
                  </>
                ) : (
                  <>
                    <span className="font-mono text-red-400">Angle</span>
                    <span className="text-text-muted ml-1">
                      #{m.nodeA}-#{m.nodeB}-#{m.nodeC}
                    </span>
                    <p className="text-text numeric mt-0.5">{m.degrees.toFixed(1)}°</p>
                  </>
                )}
              </div>
              <button
                className="text-text-muted hover:text-red-400 shrink-0"
                onClick={() => useNeuronStore.getState().removeMeasurement(i)}
                title="Remove"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
