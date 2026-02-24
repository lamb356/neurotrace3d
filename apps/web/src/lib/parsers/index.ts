import { parseSWC, computeStats, validateSWC } from "@neurotrace/swc-parser";
import type { SWCParseResult } from "@neurotrace/swc-parser";
import { parseSwcJson } from "./swcJson";
import { parseNeurolucidaAsc } from "./neurolucidaAsc";

const SUPPORTED_EXTENSIONS = [".swc", ".json", ".asc"];

/** Check if a file name has a supported neuron format extension */
export function isSupportedFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return SUPPORTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/**
 * Parse a neuron file by auto-detecting format from file extension.
 * Returns the same SWCParseResult regardless of input format.
 */
export function parseNeuronFile(fileName: string, content: string): SWCParseResult {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".swc")) return parseSWC(content);
  if (lower.endsWith(".json")) return parseSwcJson(content);
  if (lower.endsWith(".asc")) return parseNeurolucidaAsc(content);
  throw new Error(`Unsupported format: ${fileName}. Supported: .swc, .json, .asc`);
}

const IMAGE_EXTENSIONS = [".tif", ".tiff"];

/** Check if a file name is a supported image format (TIFF stack) */
export function isImageFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

// Re-export for convenience
export { computeStats, validateSWC };
