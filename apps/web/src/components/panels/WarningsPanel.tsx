"use client";

import { useState } from "react";
import type { ParseWarning } from "@neurotrace/swc-parser";

interface WarningsPanelProps {
  warnings: ParseWarning[];
}

export default function WarningsPanel({ warnings }: WarningsPanelProps) {
  const [expanded, setExpanded] = useState(false);

  if (warnings.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <button
        className="flex items-center gap-2 text-left text-sm font-semibold uppercase tracking-wider"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-yellow-500">!</span>
        Warnings ({warnings.length})
        <span className="text-text-muted text-xs">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <ul className="flex flex-col gap-1.5">
          {warnings.map((w, i) => (
            <li key={i} className="bg-bg rounded border border-yellow-500/20 px-3 py-2 text-xs">
              <span className="font-mono text-yellow-500">{w.type}</span>
              {w.line !== undefined && (
                <span className="text-text-muted ml-2">line {w.line}</span>
              )}
              <p className="text-text-muted mt-0.5">{w.message}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
