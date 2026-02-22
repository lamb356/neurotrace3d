import type { SWCMetadata } from "./types.js";

/** Normalize line endings to \n */
export function normalizeContent(content: string): string {
  return content.replace(/\r\n/g, "\n");
}

/** Normalize a single line: tabs → spaces, trim whitespace */
export function normalizeLine(line: string): string {
  return line.replace(/\t/g, " ").trim();
}

/** Metadata key → SWCMetadata field mapping */
const METADATA_MAP: Record<string, keyof SWCMetadata> = {
  ORIGINAL_SOURCE: "originalSource",
  CREATURE: "species",
  REGION: "brainRegion",
  CELL_TYPE: "cellType",
};

/** Extract metadata from a comment line into the metadata object */
export function extractMetadata(comment: string, metadata: SWCMetadata): void {
  for (const [key, field] of Object.entries(METADATA_MAP)) {
    const pattern = new RegExp(`^#?\\s*${key}\\s+(.+)`, "i");
    const match = comment.match(pattern);
    if (match) {
      metadata[field] = match[1].trim();
    }
  }
}
