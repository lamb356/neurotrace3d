"use client";

import Link from "next/link";
import BatchDropZone from "@/components/batch/BatchDropZone";
import ResultsTable from "@/components/batch/ResultsTable";
import { useBatchAnalysis } from "@/hooks/useBatchAnalysis";
import { exportBatchCSV, exportBatchXLSX } from "@/lib/exportBatch";

export default function BatchPage() {
  const { results, processing, progress, processFiles, clear } = useBatchAnalysis();

  const hasResults = results.length > 0;
  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Link
              href="/"
              className="text-text-muted hover:text-accent mb-2 inline-block text-sm transition-colors"
            >
              &larr; Back to home
            </Link>
            <h1 className="text-3xl font-bold tracking-tight">
              Batch Analysis
            </h1>
            <p className="text-text-muted mt-1 text-sm">
              Drop multiple SWC files to compute morphometrics across all neurons at once.
            </p>
          </div>

          {hasResults && (
            <div className="flex gap-2">
              <button
                className="border-border bg-surface hover:bg-surface-hover rounded border px-4 py-2 text-sm transition-colors"
                onClick={() => exportBatchCSV(results, "batch_results.csv")}
              >
                Export CSV
              </button>
              <button
                className="border-border bg-surface hover:bg-surface-hover rounded border px-4 py-2 text-sm transition-colors"
                onClick={() => exportBatchXLSX(results, "batch_results.xlsx")}
              >
                Export XLSX
              </button>
              <button
                className="rounded border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/20"
                onClick={clear}
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Drop zone */}
        {!processing && !hasResults && (
          <BatchDropZone onFiles={processFiles} />
        )}

        {/* Progress bar */}
        {processing && (
          <div className="mb-6">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-text-muted">
                Processing {progress.done} / {progress.total} files...
              </span>
              <span className="numeric font-medium">{pct}%</span>
            </div>
            <div className="bg-surface-hover h-2 overflow-hidden rounded-full">
              <div
                className="bg-accent h-full transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        {/* Results table */}
        {hasResults && (
          <div className="bg-surface border-border overflow-hidden rounded-xl border p-4">
            <ResultsTable results={results} />
          </div>
        )}

        {/* Add more files button */}
        {hasResults && !processing && (
          <div className="mt-6">
            <BatchDropZone onFiles={processFiles} />
          </div>
        )}
      </div>
    </main>
  );
}
