"use client";

import { useCallback, useRef, useState } from "react";
import { parseNeuronFile, computeStats } from "@/lib/parsers";
import type { MorphometricsResult } from "@/lib/morphometrics-types";

export interface BatchResult {
  fileName: string;
  nodeCount: number;
  totalLength: number;
  totalSurface: number;
  totalVolume: number;
  branchCount: number;
  tipCount: number;
  maxStrahlerOrder: number;
  convexHullVolume: number;
  fractalDimension: number;
  error?: string;
}

interface WorkerTask {
  file: File;
  resolve: (result: BatchResult) => void;
}

export function useBatchAnalysis() {
  const [results, setResults] = useState<BatchResult[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const workersRef = useRef<Worker[]>([]);

  const processFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    setProcessing(true);
    setResults([]);
    setProgress({ done: 0, total: files.length });

    const poolSize = Math.min(navigator.hardwareConcurrency ?? 4, 8, files.length);
    const workers: Worker[] = [];

    for (let i = 0; i < poolSize; i++) {
      workers.push(
        new Worker(
          new URL("../workers/morphometrics.worker.ts", import.meta.url),
        ),
      );
    }
    workersRef.current = workers;

    const taskQueue: WorkerTask[] = [];
    const allResults: BatchResult[] = [];
    let completed = 0;

    // Parse all files on main thread (fast) and queue for worker
    for (const file of files) {
      taskQueue.push({
        file,
        resolve: (result) => {
          allResults.push(result);
          completed++;
          setProgress({ done: completed, total: files.length });
          setResults([...allResults]);
        },
      });
    }

    // Process queue with worker pool
    const runWorker = (worker: Worker): Promise<void> => {
      return new Promise((resolveAll) => {
        const processNext = async () => {
          const task = taskQueue.shift();
          if (!task) {
            resolveAll();
            return;
          }

          try {
            const text = await task.file.text();
            const parsed = parseNeuronFile(task.file.name, text);
            const stats = computeStats(parsed);

            // Post to worker for advanced metrics
            const result = await new Promise<MorphometricsResult>((resolve, reject) => {
              const handler = (e: MessageEvent) => {
                worker.removeEventListener("message", handler);
                if (e.data.type === "result") {
                  resolve(e.data.data);
                } else {
                  reject(new Error(e.data.message ?? "Worker error"));
                }
              };
              worker.addEventListener("message", handler);
              worker.postMessage({
                nodes: Array.from(parsed.nodes.entries()),
                childIndex: Array.from(parsed.childIndex.entries()),
              });
            });

            task.resolve({
              fileName: task.file.name,
              nodeCount: stats.totalNodes,
              totalLength: result.totalLength,
              totalSurface: result.totalSurface,
              totalVolume: result.totalVolume,
              branchCount: result.branchCount,
              tipCount: result.tipCount,
              maxStrahlerOrder: result.maxStrahlerOrder,
              convexHullVolume: result.convexHullVolume,
              fractalDimension: result.fractalDimension,
            });
          } catch (err) {
            task.resolve({
              fileName: task.file.name,
              nodeCount: 0,
              totalLength: 0,
              totalSurface: 0,
              totalVolume: 0,
              branchCount: 0,
              tipCount: 0,
              maxStrahlerOrder: 0,
              convexHullVolume: 0,
              fractalDimension: 0,
              error: String(err),
            });
          }

          processNext();
        };

        processNext();
      });
    };

    await Promise.all(workers.map(runWorker));

    // Cleanup workers
    workers.forEach((w) => w.terminate());
    workersRef.current = [];
    setProcessing(false);
  }, []);

  const clear = useCallback(() => {
    workersRef.current.forEach((w) => w.terminate());
    workersRef.current = [];
    setResults([]);
    setProcessing(false);
    setProgress({ done: 0, total: 0 });
  }, []);

  return { results, processing, progress, processFiles, clear };
}
