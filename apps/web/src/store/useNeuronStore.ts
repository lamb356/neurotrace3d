import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { enableMapSet } from "immer";
import { parseSWC, computeStats, validateSWC } from "@neurotrace/swc-parser";
import type { NeuronStore } from "./types";
import { recomputeDerived } from "./derived";

enableMapSet();

const initialState = {
  tree: new Map(),
  roots: [],
  childIndex: new Map(),
  comments: [],
  metadata: {},
  warnings: [],
  stats: null,
  fileName: null,
  selection: new Set<number>(),
  hovered: null,
  focusTarget: null,
  loading: false,
  error: null,
};

export const useNeuronStore = create<NeuronStore>()(
  immer((set) => ({
    ...initialState,

    loadSWC(content: string, fileName: string) {
      set((state) => {
        try {
          const result = parseSWC(content);
          const stats = computeStats(result);
          const validationWarnings = validateSWC(result);

          state.tree = result.nodes;
          state.roots = result.roots;
          state.childIndex = result.childIndex;
          state.comments = result.comments;
          state.metadata = result.metadata;
          state.warnings = [...result.warnings, ...validationWarnings];
          state.stats = stats;
          state.fileName = fileName;
          state.selection = new Set();
          state.hovered = null;
          state.focusTarget = null;
          state.loading = false;
          state.error = null;
        } catch (err) {
          state.loading = false;
          state.error =
            err instanceof Error ? err.message : "Failed to parse file";
        }
      });
    },

    loadFile(file: File) {
      set((state) => {
        state.loading = true;
        state.error = null;
      });
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        useNeuronStore.getState().loadSWC(text, file.name);
      };
      reader.onerror = () => {
        set((state) => {
          state.loading = false;
          state.error = "Failed to read file";
        });
      };
      reader.readAsText(file);
    },

    selectNode(id: number) {
      set((state) => {
        state.selection = new Set([id]);
      });
    },

    addToSelection(id: number) {
      set((state) => {
        state.selection.add(id);
      });
    },

    toggleSelection(id: number) {
      set((state) => {
        if (state.selection.has(id)) {
          state.selection.delete(id);
        } else {
          state.selection.add(id);
        }
      });
    },

    clearSelection() {
      set((state) => {
        state.selection = new Set();
      });
    },

    setHovered(id: number | null) {
      set((state) => {
        state.hovered = id;
      });
    },

    setFocusTarget(id: number) {
      set((state) => {
        const node = state.tree.get(id);
        if (node) {
          state.focusTarget = { x: node.x, y: node.y, z: node.z };
        }
      });
    },

    clearFocusTarget() {
      set((state) => {
        state.focusTarget = null;
      });
    },
  })),
);
