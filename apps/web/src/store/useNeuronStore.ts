import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { enableMapSet } from "immer";
import { parseSWC, computeStats, validateSWC } from "@neurotrace/swc-parser";
import type { NeuronStore } from "./types";
import { recomputeDerived } from "./derived";
import { applyOpsToTree, invertOps } from "./operations";
import {
  createMoveOps,
  createDeleteOps,
  createInsertOps,
  createRetypeOps,
  createReparentOps,
  createPruneOps,
  createAppendNodeOps,
} from "./editActions";
import { euclideanDistance, pathDistance, branchAngle, findPath } from "@/lib/measurements";

const MAX_HISTORY = 100;

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
  history: [],
  future: [],
  activeTool: "select" as const,
  extendingFrom: null,
  measurements: [] as import("./types").Measurement[],
  measurePending: [] as number[],
  source: null,
  neuromorphoMeta: null,
  showShollSpheres: false,
  shollRadiusStep: 10,
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
          state.history = [];
          state.future = [];
          state.source = "local";
          state.neuromorphoMeta = null;
          state.measurements = [];
          state.measurePending = [];
          state.extendingFrom = null;
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

    async loadFromNeuromorpho(name: string) {
      set((state) => {
        state.loading = true;
        state.error = null;
      });
      try {
        const swcRes = await fetch(`/api/neuromorpho/swc/${encodeURIComponent(name)}`);
        if (!swcRes.ok) throw new Error(`Failed to load SWC: ${swcRes.statusText}`);
        const swcText = await swcRes.text();

        const metaRes = await fetch(`/api/neuromorpho/neuron/${encodeURIComponent(name)}`);
        const meta = metaRes.ok ? await metaRes.json() : null;

        useNeuronStore.getState().loadSWC(swcText, name + ".swc");

        set((state) => {
          state.neuromorphoMeta = meta;
          state.source = "neuromorpho";
        });
      } catch (err) {
        set((state) => {
          state.loading = false;
          state.error = err instanceof Error ? err.message : "Failed to load from NeuroMorpho";
        });
      }
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

    applyOps(ops) {
      if (ops.length === 0) return;
      set((state) => {
        applyOpsToTree(state.tree, ops);
        state.history.push(ops);
        if (state.history.length > MAX_HISTORY) {
          state.history.shift();
        }
        state.future = [];
        recomputeDerived(state);
      });
    },

    undo() {
      set((state) => {
        const ops = state.history.pop();
        if (!ops) return;
        const inverted = invertOps(ops);
        applyOpsToTree(state.tree, inverted);
        state.future.push(ops);
        recomputeDerived(state);
      });
    },

    redo() {
      set((state) => {
        const ops = state.future.pop();
        if (!ops) return;
        applyOpsToTree(state.tree, ops);
        state.history.push(ops);
        recomputeDerived(state);
      });
    },

    moveNode(id, x, y, z) {
      const ops = createMoveOps(useNeuronStore.getState().tree, id, x, y, z);
      if (ops.length > 0) useNeuronStore.getState().applyOps(ops);
    },

    deleteNodes(ids) {
      const state = useNeuronStore.getState();
      const ops = createDeleteOps(state, ids);
      if (ops.length > 0) state.applyOps(ops);
    },

    insertNode(parentId, childId, position) {
      const state = useNeuronStore.getState();
      const ops = createInsertOps(state.tree, parentId, childId, position);
      if (ops.length > 0) state.applyOps(ops);
    },

    retypeNodes(ids, newType) {
      const ops = createRetypeOps(useNeuronStore.getState().tree, ids, newType);
      if (ops.length > 0) useNeuronStore.getState().applyOps(ops);
    },

    reparentNode(id, newParentId) {
      const ops = createReparentOps(useNeuronStore.getState().tree, id, newParentId);
      if (ops.length > 0) useNeuronStore.getState().applyOps(ops);
    },

    pruneSubtree(rootId) {
      const state = useNeuronStore.getState();
      const ops = createPruneOps(state, rootId);
      if (ops.length > 0) state.applyOps(ops);
    },

    startExtend(tipId) {
      set((state) => {
        // Verify it's a tip (no children)
        const children = state.childIndex.get(tipId) ?? [];
        if (children.length > 0) return;
        state.extendingFrom = tipId;
        state.selection = new Set([tipId]);
      });
    },

    placeExtendNode(position) {
      const state = useNeuronStore.getState();
      if (state.extendingFrom === null) return;
      const ops = createAppendNodeOps(state.tree, state.extendingFrom, position);
      if (ops.length === 0) return;
      // The new node ID is in the INSERT op
      const newId = ops[0].nodeId;
      state.applyOps(ops);
      // Update extendingFrom to the new node so we chain from it
      set((s) => {
        s.extendingFrom = newId;
        s.selection = new Set([newId]);
      });
    },

    stopExtend() {
      set((state) => {
        state.extendingFrom = null;
      });
    },

    selectSubtree(rootId) {
      set((state) => {
        const ids = new Set<number>([rootId]);
        const queue = [rootId];
        while (queue.length > 0) {
          const current = queue.shift()!;
          const children = state.childIndex.get(current) ?? [];
          for (const child of children) {
            ids.add(child);
            queue.push(child);
          }
        }
        state.selection = ids;
      });
    },

    setActiveTool(tool) {
      set((state) => {
        state.activeTool = tool;
        state.measurePending = [];
        state.extendingFrom = null;
      });
    },

    addMeasurePending(id: number) {
      set((state) => {
        // Don't add duplicates in sequence
        if (state.measurePending.length > 0 && state.measurePending[state.measurePending.length - 1] === id) return;
        state.measurePending.push(id);

        const needed = state.activeTool === "measure-distance" ? 2 : 3;
        if (state.measurePending.length >= needed) {
          const ids = state.measurePending;
          if (state.activeTool === "measure-distance") {
            const a = state.tree.get(ids[0]);
            const b = state.tree.get(ids[1]);
            if (a && b) {
              state.measurements.push({
                kind: "distance",
                nodeA: ids[0],
                nodeB: ids[1],
                euclidean: euclideanDistance(a, b),
                path: pathDistance(state.tree, state.childIndex, ids[0], ids[1]),
              });
            }
          } else {
            const a = state.tree.get(ids[0]);
            const b = state.tree.get(ids[1]);
            const c = state.tree.get(ids[2]);
            if (a && b && c) {
              state.measurements.push({
                kind: "angle",
                nodeA: ids[0],
                nodeB: ids[1],
                nodeC: ids[2],
                degrees: branchAngle(a, b, c),
              });
            }
          }
          state.measurePending = [];
        }
      });
    },

    clearMeasurements() {
      set((state) => {
        state.measurements = [];
        state.measurePending = [];
      });
    },

    removeMeasurement(index: number) {
      set((state) => {
        state.measurements.splice(index, 1);
      });
    },

    addPathSelectPending(id: number, shiftKey: boolean) {
      set((state) => {
        // Deduplicate consecutive identical IDs
        if (state.measurePending.length > 0 && state.measurePending[state.measurePending.length - 1] === id) return;
        state.measurePending.push(id);

        if (state.measurePending.length >= 2) {
          const [idA, idB] = state.measurePending;
          const path = findPath(state.tree, state.childIndex, idA, idB);
          state.measurePending = [];

          if (path && path.length > 0) {
            if (shiftKey) {
              for (const nodeId of path) state.selection.add(nodeId);
            } else {
              state.selection = new Set(path);
            }
          } else if (!shiftKey) {
            state.selection = new Set();
          }
        }
      });
    },

    setShowShollSpheres(show: boolean) {
      set((state) => {
        state.showShollSpheres = show;
      });
    },

    setShollRadiusStep(step: number) {
      set((state) => {
        state.shollRadiusStep = step;
      });
    },
  })),
);
