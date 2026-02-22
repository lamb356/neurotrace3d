"use client";

import { useState, useCallback } from "react";
import {
  parseSWC,
  computeStats,
  validateSWC,
} from "@neurotrace/swc-parser";
import type {
  SWCParseResult,
  MorphologyStats,
  ParseWarning,
} from "@neurotrace/swc-parser";

interface NeuronData {
  result: SWCParseResult | null;
  stats: MorphologyStats | null;
  warnings: ParseWarning[];
  filename: string | null;
  loading: boolean;
  error: string | null;
}

export function useNeuronData() {
  const [data, setData] = useState<NeuronData>({
    result: null,
    stats: null,
    warnings: [],
    filename: null,
    loading: false,
    error: null,
  });

  const loadFile = useCallback((file: File) => {
    setData((prev) => ({ ...prev, loading: true, error: null }));
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result as string;
        const result = parseSWC(text);
        const stats = computeStats(result);
        const validationWarnings = validateSWC(result);
        const warnings = [...result.warnings, ...validationWarnings];
        setData({
          result,
          stats,
          warnings,
          filename: file.name,
          loading: false,
          error: null,
        });
      } catch (err) {
        setData((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : "Failed to parse file",
        }));
      }
    };
    reader.onerror = () => {
      setData((prev) => ({
        ...prev,
        loading: false,
        error: "Failed to read file",
      }));
    };
    reader.readAsText(file);
  }, []);

  const loadText = useCallback((text: string, filename: string) => {
    try {
      const result = parseSWC(text);
      const stats = computeStats(result);
      const validationWarnings = validateSWC(result);
      const warnings = [...result.warnings, ...validationWarnings];
      setData({ result, stats, warnings, filename, loading: false, error: null });
    } catch (err) {
      setData({
        result: null,
        stats: null,
        warnings: [],
        filename,
        loading: false,
        error: err instanceof Error ? err.message : "Failed to parse file",
      });
    }
  }, []);

  return { ...data, loadFile, loadText };
}
