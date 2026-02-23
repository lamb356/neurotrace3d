"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useNeuronStore } from "@/store/useNeuronStore";
import type { MorphometricsResult } from "@/lib/morphometrics-types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function MorphometricsPanel() {
  const tree = useNeuronStore((s) => s.tree);
  const childIndex = useNeuronStore((s) => s.childIndex);
  const [collapsed, setCollapsed] = useState(false);
  const [result, setResult] = useState<MorphometricsResult | null>(null);
  const [computing, setComputing] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  // Spawn worker and compute on tree change
  useEffect(() => {
    if (tree.size === 0) {
      setResult(null);
      return;
    }

    setComputing(true);

    // Create worker
    const worker = new Worker(
      new URL("../../workers/morphometrics.worker.ts", import.meta.url),
    );
    workerRef.current = worker;

    worker.onmessage = (e) => {
      if (e.data.type === "result") {
        setResult(e.data.data);
      }
      setComputing(false);
    };

    worker.onerror = () => {
      setComputing(false);
    };

    // Serialize and post
    worker.postMessage({
      nodes: Array.from(tree.entries()),
      childIndex: Array.from(childIndex.entries()),
    });

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, [tree, childIndex]);

  if (tree.size === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <button
        className="flex w-full items-center gap-1.5 text-left"
        onClick={() => setCollapsed((c) => !c)}
      >
        <svg
          className="h-3 w-3 transition-transform duration-200"
          style={{ transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)" }}
          viewBox="0 0 12 12"
          fill="currentColor"
        >
          <path d="M3 2l6 4-6 4z" />
        </svg>
        <h3 className="text-sm font-semibold uppercase tracking-wider">
          Morphometrics
        </h3>
      </button>

      {!collapsed && (
        <>
          {computing && (
            <p className="text-text-muted animate-pulse text-xs">Computing...</p>
          )}

          {result && (
            <>
              {/* Scalar metrics */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <Stat label="Total Length" value={`${result.totalLength.toFixed(1)} µm`} />
                <Stat label="Total Surface" value={`${result.totalSurface.toFixed(1)} µm²`} />
                <Stat label="Total Volume" value={`${result.totalVolume.toFixed(1)} µm³`} />
                <Stat label="Branch Points" value={result.branchCount} />
                <Stat label="Tips" value={result.tipCount} />
                <Stat label="Max Strahler" value={result.maxStrahlerOrder} />
                <Stat label="Hull Volume" value={`${result.convexHullVolume.toFixed(1)} µm³`} />
                <Stat label="Fractal Dim." value={result.fractalDimension.toFixed(3)} />
              </div>

              {/* Branch angle polar histogram */}
              {result.branchAngles.length > 0 && (
                <div>
                  <p className="text-text-muted mb-1 text-xs font-medium">Branch Angles</p>
                  <PolarHistogram angles={result.branchAngles} />
                </div>
              )}

              {/* Tip path length distribution */}
              {result.tipPathLengths.length > 0 && (
                <div>
                  <p className="text-text-muted mb-1 text-xs font-medium">Tip Path Lengths</p>
                  <HistogramChart
                    values={result.tipPathLengths}
                    xLabel="Distance (µm)"
                    color="#60a5fa"
                  />
                </div>
              )}

              {/* Tortuosity distribution */}
              {result.segmentTortuosity.length > 0 && (
                <div>
                  <p className="text-text-muted mb-1 text-xs font-medium">Segment Tortuosity</p>
                  <HistogramChart
                    values={result.segmentTortuosity.map((s) => s.value)}
                    xLabel="Tortuosity"
                    color="#52b788"
                  />
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-text-muted text-xs">{label}</p>
      <p className="numeric font-medium">{value}</p>
    </div>
  );
}

/* ── Polar Histogram ─────────────────────────────────────────── */

function PolarHistogram({ angles }: { angles: number[] }) {
  const bins = useMemo(() => {
    const BIN_COUNT = 24;
    const BIN_WIDTH = 180 / BIN_COUNT; // 7.5°
    const counts = new Array(BIN_COUNT).fill(0);
    for (const a of angles) {
      const idx = Math.min(Math.floor(a / BIN_WIDTH), BIN_COUNT - 1);
      counts[idx]++;
    }
    return counts;
  }, [angles]);

  const maxCount = Math.max(...bins, 1);
  const cx = 100;
  const cy = 100;
  const maxR = 80;
  const BIN_COUNT = 24;
  const BIN_WIDTH_DEG = 180 / BIN_COUNT;

  return (
    <svg viewBox="0 0 200 200" className="h-48 w-48">
      {/* Background circles */}
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <circle
          key={f}
          cx={cx}
          cy={cy}
          r={maxR * f}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={0.5}
        />
      ))}
      {/* Wedges */}
      {bins.map((count, i) => {
        if (count === 0) return null;
        const startAngle = (i * BIN_WIDTH_DEG * Math.PI) / 180 - Math.PI / 2;
        const endAngle = ((i + 1) * BIN_WIDTH_DEG * Math.PI) / 180 - Math.PI / 2;
        const r = (count / maxCount) * maxR;
        const x1 = cx + r * Math.cos(startAngle);
        const y1 = cy + r * Math.sin(startAngle);
        const x2 = cx + r * Math.cos(endAngle);
        const y2 = cy + r * Math.sin(endAngle);
        return (
          <path
            key={i}
            d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`}
            fill="#60a5fa"
            fillOpacity={0.6}
            stroke="#60a5fa"
            strokeWidth={0.5}
          />
        );
      })}
      {/* Labels */}
      <text x={cx} y={12} textAnchor="middle" fontSize={9} fill="var(--color-text-muted)">0°</text>
      <text x={cx + maxR + 8} y={cy + 3} textAnchor="start" fontSize={9} fill="var(--color-text-muted)">90°</text>
      <text x={cx} y={cy + maxR + 14} textAnchor="middle" fontSize={9} fill="var(--color-text-muted)">180°</text>
    </svg>
  );
}

/* ── Histogram Chart (Recharts) ──────────────────────────────── */

function HistogramChart({
  values,
  xLabel,
  color,
}: {
  values: number[];
  xLabel: string;
  color: string;
}) {
  const data = useMemo(() => {
    if (values.length === 0) return [];
    const BIN_COUNT = Math.min(20, Math.max(5, Math.ceil(Math.sqrt(values.length))));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const binWidth = range / BIN_COUNT;
    const bins = new Array(BIN_COUNT).fill(0);
    for (const v of values) {
      const idx = Math.min(Math.floor((v - min) / binWidth), BIN_COUNT - 1);
      bins[idx]++;
    }
    return bins.map((count, i) => ({
      bin: (min + (i + 0.5) * binWidth).toFixed(1),
      count,
    }));
  }, [values]);

  return (
    <div className="h-32 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis
            dataKey="bin"
            tick={{ fontSize: 9, fill: "var(--color-text-muted)" }}
            label={{
              value: xLabel,
              position: "insideBottom",
              offset: -2,
              fontSize: 9,
              fill: "var(--color-text-muted)",
            }}
            interval="preserveStartEnd"
          />
          <YAxis tick={{ fontSize: 9, fill: "var(--color-text-muted)" }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 6,
              fontSize: 11,
            }}
          />
          <Bar dataKey="count" fill={color} fillOpacity={0.7} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
