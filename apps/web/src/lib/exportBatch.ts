import type { BatchResult } from "@/hooks/useBatchAnalysis";

const HEADERS = [
  "fileName",
  "nodeCount",
  "totalLength",
  "totalSurface",
  "totalVolume",
  "branchCount",
  "tipCount",
  "maxStrahlerOrder",
  "convexHullVolume",
  "fractalDimension",
  "error",
] as const;

export function exportBatchCSV(results: BatchResult[], fileName: string): void {
  const rows = [HEADERS.join(",")];
  for (const r of results) {
    rows.push(
      HEADERS.map((h) => {
        const val = r[h as keyof BatchResult];
        if (val === undefined) return "";
        if (typeof val === "string") return `"${val.replace(/"/g, '""')}"`;
        return String(val);
      }).join(","),
    );
  }

  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportBatchXLSX(
  results: BatchResult[],
  fileName: string,
): Promise<void> {
  const XLSX = await import("xlsx");

  const data = results.map((r) => ({
    File: r.fileName,
    Nodes: r.nodeCount,
    "Length (µm)": +r.totalLength.toFixed(2),
    "Surface (µm²)": +r.totalSurface.toFixed(2),
    "Volume (µm³)": +r.totalVolume.toFixed(2),
    Branches: r.branchCount,
    Tips: r.tipCount,
    "Max Strahler": r.maxStrahlerOrder,
    "Hull Volume (µm³)": +r.convexHullVolume.toFixed(2),
    "Fractal Dim.": +r.fractalDimension.toFixed(4),
    Error: r.error ?? "",
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Batch Results");
  XLSX.writeFile(wb, fileName);
}
