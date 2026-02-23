import type {
  SWCNode,
  SWCMetadata,
  ParseWarning,
  MorphologyStats,
} from "@neurotrace/swc-parser";
import type { TreeOp } from "./operations";
import type { NeuromorphoNeuron } from "@/lib/neuromorpho-types";

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

  // History
  history: TreeOp[][];
  future: TreeOp[][];

  // Tool
  activeTool: "select" | "move" | "insert" | "delete";

  // Source
  source: "local" | "neuromorpho" | null;
  neuromorphoMeta: NeuromorphoNeuron | null;

  // UI
  loading: boolean;
  error: string | null;
}

export interface NeuronActions {
  loadSWC(content: string, fileName: string): void;
  loadFile(file: File): void;
  loadFromNeuromorpho(name: string): Promise<void>;

  // Selection
  selectNode(id: number): void;
  addToSelection(id: number): void;
  toggleSelection(id: number): void;
  clearSelection(): void;
  setHovered(id: number | null): void;

  // Camera
  setFocusTarget(id: number): void;
  clearFocusTarget(): void;

  // History
  applyOps(ops: TreeOp[]): void;
  undo(): void;
  redo(): void;

  // Edit operations
  moveNode(id: number, x: number, y: number, z: number): void;
  deleteNodes(ids: number[]): void;
  insertNode(parentId: number, childId: number, position: { x: number; y: number; z: number }): void;
  retypeNodes(ids: number[], newType: number): void;
  reparentNode(id: number, newParentId: number): void;
  selectSubtree(rootId: number): void;
  setActiveTool(tool: NeuronState["activeTool"]): void;
}

export type NeuronStore = NeuronState & NeuronActions;
