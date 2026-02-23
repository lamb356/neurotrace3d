"use client";

import { useMemo, useState } from "react";
import type { BatchResult } from "@/hooks/useBatchAnalysis";

type SortField = keyof Omit<BatchResult, "error">;
type SortDir = "asc" | "desc";

const COLUMNS: { key: SortField; label: string; unit?: string }[] = [
  { key: "fileName", label: "File" },
  { key: "nodeCount", label: "Nodes" },
  { key: "totalLength", label: "Length", unit: "µm" },
  { key: "totalSurface", label: "Surface", unit: "µm²" },
  { key: "totalVolume", label: "Volume", unit: "µm³" },
  { key: "branchCount", label: "Branches" },
  { key: "tipCount", label: "Tips" },
  { key: "maxStrahlerOrder", label: "Strahler" },
  { key: "convexHullVolume", label: "Hull Vol", unit: "µm³" },
  { key: "fractalDimension", label: "Fractal D" },
];

interface ResultsTableProps {
  results: BatchResult[];
}

export default function ResultsTable({ results }: ResultsTableProps) {
  const [sortField, setSortField] = useState<SortField>("fileName");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [filter, setFilter] = useState("");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const filtered = useMemo(() => {
    if (!filter) return results;
    const lc = filter.toLowerCase();
    return results.filter((r) => r.fileName.toLowerCase().includes(lc));
  }, [results, filter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortField];
      const bv = b[sortField];
      let cmp = 0;
      if (typeof av === "string" && typeof bv === "string") {
        cmp = av.localeCompare(bv);
      } else {
        cmp = (av as number) - (bv as number);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortField, sortDir]);

  const fmt = (val: number, decimals = 1) =>
    typeof val === "number" ? val.toFixed(decimals) : "—";

  return (
    <div className="flex flex-col gap-3">
      <input
        type="text"
        placeholder="Filter by filename..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="bg-bg border-border w-full max-w-xs rounded border px-3 py-1.5 text-sm"
      />

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-border border-b">
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className="cursor-pointer select-none px-3 py-2 text-left font-semibold hover:text-accent"
                  onClick={() => handleSort(col.key)}
                >
                  {col.label}
                  {col.unit && (
                    <span className="text-text-muted ml-0.5 text-[10px] font-normal">
                      ({col.unit})
                    </span>
                  )}
                  {sortField === col.key && (
                    <span className="ml-1">{sortDir === "asc" ? "▲" : "▼"}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => (
              <tr
                key={`${r.fileName}-${i}`}
                className={`border-border border-b last:border-0 ${
                  r.error ? "bg-red-500/10 text-red-400" : ""
                }`}
              >
                <td className="max-w-[200px] truncate px-3 py-1.5" title={r.error ?? r.fileName}>
                  {r.fileName}
                  {r.error && <span className="ml-1 text-[10px]">(error)</span>}
                </td>
                <td className="numeric px-3 py-1.5">{r.nodeCount}</td>
                <td className="numeric px-3 py-1.5">{fmt(r.totalLength)}</td>
                <td className="numeric px-3 py-1.5">{fmt(r.totalSurface)}</td>
                <td className="numeric px-3 py-1.5">{fmt(r.totalVolume)}</td>
                <td className="numeric px-3 py-1.5">{r.branchCount}</td>
                <td className="numeric px-3 py-1.5">{r.tipCount}</td>
                <td className="numeric px-3 py-1.5">{r.maxStrahlerOrder}</td>
                <td className="numeric px-3 py-1.5">{fmt(r.convexHullVolume)}</td>
                <td className="numeric px-3 py-1.5">{fmt(r.fractalDimension, 3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sorted.length === 0 && (
        <p className="text-text-muted py-4 text-center text-sm">No results yet</p>
      )}
    </div>
  );
}
