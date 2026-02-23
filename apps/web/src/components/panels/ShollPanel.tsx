"use client";

import { useMemo, useState } from "react";
import { useNeuronStore } from "@/store/useNeuronStore";
import { computeSholl, exportShollCSV, type ShollResult } from "@/lib/sholl";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function ShollPanel() {
  const tree = useNeuronStore((s) => s.tree);
  const childIndex = useNeuronStore((s) => s.childIndex);
  const roots = useNeuronStore((s) => s.roots);
  const fileName = useNeuronStore((s) => s.fileName);
  const showSpheres = useNeuronStore((s) => s.showShollSpheres);
  const radiusStep = useNeuronStore((s) => s.shollRadiusStep);
  const setShowSpheres = useNeuronStore((s) => s.setShowShollSpheres);
  const setRadiusStep = useNeuronStore((s) => s.setShollRadiusStep);
  const [collapsed, setCollapsed] = useState(false);

  const shollData = useMemo(
    () => computeSholl(tree, childIndex, roots, radiusStep),
    [tree, childIndex, roots, radiusStep],
  );

  const summary = useMemo(() => {
    if (shollData.length === 0) return null;
    let peak: ShollResult = shollData[0];
    let total = 0;
    for (const d of shollData) {
      total += d.intersections;
      if (d.intersections > peak.intersections) peak = d;
    }
    return { peak, total };
  }, [shollData]);

  if (tree.size === 0) return null;

  const handleExport = () => {
    const name = fileName?.replace(/\.swc$/i, "_sholl.csv") ?? "sholl.csv";
    exportShollCSV(shollData, name);
  };

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
          Sholl Analysis
        </h3>
      </button>

      {!collapsed && (
        <>
          {/* Controls */}
          <div className="flex items-center gap-3 text-xs">
            <label className="text-text-muted flex items-center gap-1">
              Radius step:
              <input
                type="number"
                min={1}
                max={500}
                value={radiusStep}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (v > 0) setRadiusStep(v);
                }}
                className="bg-bg border-border w-16 rounded border px-1.5 py-0.5 text-xs"
              />
              <span className="text-text-muted">um</span>
            </label>
            <label className="text-text-muted flex items-center gap-1">
              <input
                type="checkbox"
                checked={showSpheres}
                onChange={(e) => setShowSpheres(e.target.checked)}
                className="accent-accent"
              />
              3D spheres
            </label>
          </div>

          {shollData.length === 0 ? (
            <p className="text-text-muted text-xs">No data (no soma found)</p>
          ) : (
            <>
              {/* Chart */}
              <div className="h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={shollData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis
                      dataKey="radius"
                      tick={{ fontSize: 10, fill: "var(--color-text-muted)" }}
                      label={{ value: "Radius (um)", position: "insideBottom", offset: -2, fontSize: 10, fill: "var(--color-text-muted)" }}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "var(--color-text-muted)" }}
                      label={{ value: "Intersections", angle: -90, position: "insideLeft", fontSize: 10, fill: "var(--color-text-muted)" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--color-surface)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 6,
                        fontSize: 11,
                      }}
                      labelFormatter={(v) => `r = ${v} um`}
                    />
                    <Line
                      type="monotone"
                      dataKey="intersections"
                      stroke="#60a5fa"
                      strokeWidth={1.5}
                      dot={false}
                      activeDot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Summary */}
              {summary && (
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-text-muted">Peak</p>
                    <p className="font-medium">{summary.peak.intersections}</p>
                  </div>
                  <div>
                    <p className="text-text-muted">Peak radius</p>
                    <p className="font-medium">{summary.peak.radius} um</p>
                  </div>
                  <div>
                    <p className="text-text-muted">Total</p>
                    <p className="font-medium">{summary.total}</p>
                  </div>
                </div>
              )}

              <button
                className="border-border bg-surface hover:bg-surface-hover rounded border px-3 py-1.5 text-xs transition-colors"
                onClick={handleExport}
              >
                Export CSV
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}
