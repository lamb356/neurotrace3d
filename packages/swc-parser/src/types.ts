/** SWC neurite type codes (0–7) */
export const SWC_TYPE = {
  UNDEFINED: 0,
  SOMA: 1,
  AXON: 2,
  BASAL_DENDRITE: 3,
  APICAL_DENDRITE: 4,
  CUSTOM5: 5,
  CUSTOM6: 6,
  CUSTOM7: 7,
} as const;

export type SWCTypeCode = (typeof SWC_TYPE)[keyof typeof SWC_TYPE];

/** A single node in an SWC file */
export interface SWCNode {
  id: number;
  type: number;
  x: number;
  y: number;
  z: number;
  radius: number;
  parentId: number;
}

/** Warning types emitted during parsing or validation */
export type WarningType =
  | "MALFORMED_LINE"
  | "DUPLICATE_ID"
  | "UNKNOWN_TYPE"
  | "INVALID_PARENT"
  | "NO_ROOT"
  | "NON_SEQUENTIAL_IDS"
  | "MISSING_SOMA"
  | "RADIUS_OUTLIER"
  | "CYCLE_DETECTED"
  | "DISCONNECTED_COMPONENT";

/** A warning emitted during parsing or validation */
export interface ParseWarning {
  type: WarningType;
  message: string;
  line?: number;
  nodeId?: number;
}

/** Metadata extracted from SWC header comments */
export interface SWCMetadata {
  originalSource?: string;
  species?: string;
  brainRegion?: string;
  cellType?: string;
}

/** Full result from parsing an SWC file */
export interface SWCParseResult {
  nodes: Map<number, SWCNode>;
  roots: number[];
  childIndex: Map<number, number[]>;
  comments: string[];
  metadata: SWCMetadata;
  warnings: ParseWarning[];
}

/** Morphology statistics computed from a parsed SWC */
export interface MorphologyStats {
  totalNodes: number;
  totalLength: number;
  branchPoints: number;
  terminalTips: number;
  maxPathDistance: number;
  maxBranchOrder: number;
  nodeCountByType: Map<number, number>;
  rootCount: number;
}
