"use client";

import { useNeuronStore } from "@/store/useNeuronStore";
import { getTypeColor, getTypeLabel } from "@/lib/colors";

export default function StatsPanel() {
  const stats = useNeuronStore((s) => s.stats);
  if (!stats) return null;

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold uppercase tracking-wider">Statistics</h3>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <Stat label="Total Nodes" value={stats.totalNodes} />
        <Stat label="Roots" value={stats.rootCount} />
        <Stat label="Branch Points" value={stats.branchPoints} />
        <Stat label="Terminal Tips" value={stats.terminalTips} />
        <Stat label="Total Length" value={`${stats.totalLength.toFixed(1)} \u00b5m`} />
        <Stat label="Max Path Dist" value={`${stats.maxPathDistance.toFixed(1)} \u00b5m`} />
        <Stat label="Max Branch Order" value={stats.maxBranchOrder} />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {Array.from(stats.nodeCountByType.entries()).map(([type, count]) => (
          <span
            key={type}
            className="rounded-full px-2.5 py-0.5 text-xs font-medium"
            style={{
              backgroundColor: getTypeColor(type) + "22",
              color: getTypeColor(type),
              border: `1px solid ${getTypeColor(type)}44`,
            }}
          >
            {getTypeLabel(type)}: {count}
          </span>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-text-muted text-xs">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
