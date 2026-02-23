"use client";

import { useMemo, useState } from "react";
import { useNeuronStore } from "@/store/useNeuronStore";
import {
  computeExtraWarnings,
  getWarningSeverity,
  sortBySeverity,
  type EnhancedWarning,
  type WarningSeverity,
} from "@/lib/validation";
import { recomputeDerived } from "@/store/derived";

const SEVERITY_COLORS: Record<WarningSeverity, { badge: string; border: string }> = {
  error: { badge: "text-red-400 bg-red-500/10 border-red-500/20", border: "border-red-500/20" },
  warning: { badge: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20", border: "border-yellow-500/20" },
  info: { badge: "text-blue-400 bg-blue-500/10 border-blue-500/20", border: "border-blue-400/20" },
};

export default function WarningsPanel() {
  const warnings = useNeuronStore((s) => s.warnings);
  const tree = useNeuronStore((s) => s.tree);
  const childIndex = useNeuronStore((s) => s.childIndex);
  const selectNode = useNeuronStore((s) => s.selectNode);
  const setFocusTarget = useNeuronStore((s) => s.setFocusTarget);
  const [expanded, setExpanded] = useState(false);
  const [filter, setFilter] = useState<WarningSeverity | "all">("all");

  // Merge parse warnings + extra validation warnings
  const allWarnings = useMemo(() => {
    const parseWarnings: EnhancedWarning[] = warnings.map((w) => ({
      type: w.type,
      message: w.message,
      nodeId: w.nodeId,
      severity: getWarningSeverity(w.type),
    }));
    const extra = computeExtraWarnings(tree, childIndex);
    return [...parseWarnings, ...extra].sort(sortBySeverity);
  }, [warnings, tree, childIndex]);

  const filtered = useMemo(
    () => (filter === "all" ? allWarnings : allWarnings.filter((w) => w.severity === filter)),
    [allWarnings, filter],
  );

  const counts = useMemo(() => {
    const c = { error: 0, warning: 0, info: 0 };
    for (const w of allWarnings) c[w.severity]++;
    return c;
  }, [allWarnings]);

  if (allWarnings.length === 0) return null;

  const handleClick = (w: EnhancedWarning) => {
    if (w.nodeId != null) {
      selectNode(w.nodeId);
      setFocusTarget(w.nodeId);
    }
  };

  const handleRevalidate = () => {
    // Force recompute derived state (stats, warnings, childIndex)
    useNeuronStore.setState((state) => {
      recomputeDerived(state);
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <button
          className="flex flex-1 items-center gap-1.5 text-left"
          onClick={() => setExpanded(!expanded)}
        >
          <svg
            className="h-3 w-3 transition-transform duration-200"
            style={{ transform: expanded ? "rotate(0deg)" : "rotate(-90deg)" }}
            viewBox="0 0 12 12"
            fill="currentColor"
          >
            <path d="M3 2l6 4-6 4z" />
          </svg>
          <h3 className="text-sm font-semibold uppercase tracking-wider">
            Warnings ({allWarnings.length})
          </h3>
        </button>
        <button
          className="text-text-muted hover:text-text text-xs"
          onClick={handleRevalidate}
          title="Re-validate"
        >
          Re-validate
        </button>
      </div>

      {expanded && (
        <>
          {/* Filter toggles */}
          <div className="flex gap-1">
            <FilterButton
              label="All"
              count={allWarnings.length}
              active={filter === "all"}
              onClick={() => setFilter("all")}
              color="text-text"
            />
            <FilterButton
              label="Errors"
              count={counts.error}
              active={filter === "error"}
              onClick={() => setFilter("error")}
              color="text-red-400"
            />
            <FilterButton
              label="Warnings"
              count={counts.warning}
              active={filter === "warning"}
              onClick={() => setFilter("warning")}
              color="text-yellow-500"
            />
            <FilterButton
              label="Info"
              count={counts.info}
              active={filter === "info"}
              onClick={() => setFilter("info")}
              color="text-blue-400"
            />
          </div>

          {/* Warning list */}
          <ul className="flex max-h-60 flex-col gap-1.5 overflow-y-auto">
            {filtered.map((w, i) => {
              const colors = SEVERITY_COLORS[w.severity];
              const clickable = w.nodeId != null;
              return (
                <li
                  key={`${w.type}-${w.nodeId ?? ""}-${i}`}
                  className={`bg-bg rounded border px-3 py-2 text-xs ${colors.border} ${
                    clickable ? "cursor-pointer hover:bg-surface-hover" : ""
                  }`}
                  onClick={() => handleClick(w)}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${colors.badge}`}
                    >
                      {w.severity}
                    </span>
                    <span className="font-mono">{w.type}</span>
                    {w.nodeId != null && (
                      <span className="text-text-muted">node #{w.nodeId}</span>
                    )}
                  </div>
                  <p className="text-text-muted mt-0.5">{w.message}</p>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

function FilterButton({
  label,
  count,
  active,
  onClick,
  color,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  color: string;
}) {
  if (count === 0 && label !== "All") return null;
  return (
    <button
      className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${color} ${
        active ? "bg-surface-hover" : "hover:bg-surface-hover/50"
      }`}
      onClick={onClick}
    >
      {label} ({count})
    </button>
  );
}
