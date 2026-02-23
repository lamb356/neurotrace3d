import type {
  SWCNode,
  SWCMetadata,
  ParseWarning,
  MorphologyStats,
} from "@neurotrace/swc-parser";

export interface NeuronState {
  // Tree data
  tree: Map<number, SWCNode>;
  roots: number[];
  childIndex: Map<number, number[]>;
  comments: string[];
  metadata: SWCMetadata;
  warnings: ParseWarning[];
  stats: MorphologyStats | null;
  fileName: string | null;

  // Selection
  selection: Set<number>;
  hovered: number | null;

  // Camera
  focusTarget: { x: number; y: number; z: number } | null;

  // UI
  loading: boolean;
  error: string | null;
}

export interface NeuronActions {
  loadSWC(content: string, fileName: string): void;
  loadFile(file: File): void;

  // Selection
  selectNode(id: number): void;
  addToSelection(id: number): void;
  toggleSelection(id: number): void;
  clearSelection(): void;
  setHovered(id: number | null): void;

  // Camera
  setFocusTarget(id: number): void;
  clearFocusTarget(): void;
}

export type NeuronStore = NeuronState & NeuronActions;
