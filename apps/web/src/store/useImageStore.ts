import { create } from "zustand";
import { parseOmeXml } from "@/lib/omeXml";

interface ImageState {
  // Loading
  loading: boolean;
  error: string | null;

  // Metadata
  fileName: string | null;
  sliceCount: number;
  width: number;
  height: number;
  bitDepth: number;
  physicalPixelSize: { x: number; y: number; z: number } | null;

  // Navigation
  currentZ: number;

  // Display
  visible: boolean;
  opacity: number;
  brightness: number;
  contrast: number;

  // Registration
  offsetX: number;
  offsetY: number;
  offsetZ: number;
  scale: number;
  plane: "xy" | "xz" | "yz";

  // Texture cache (z-index → RGBA data)
  sliceTextures: Map<number, Uint8Array>;
}

interface ImageActions {
  loadTiff(file: File): void;
  setCurrentZ(z: number): void;
  stepZ(delta: number): void;
  setVisible(v: boolean): void;
  setOpacity(v: number): void;
  setBrightness(v: number): void;
  setContrast(v: number): void;
  setOffset(x: number, y: number, z: number): void;
  setScale(s: number): void;
  setPlane(p: ImageState["plane"]): void;
  clear(): void;
}

type ImageStore = ImageState & ImageActions;

const PREFETCH_RADIUS = 3;

let worker: Worker | null = null;

const initialState: ImageState = {
  loading: false,
  error: null,
  fileName: null,
  sliceCount: 0,
  width: 0,
  height: 0,
  bitDepth: 8,
  physicalPixelSize: null,
  currentZ: 0,
  visible: true,
  opacity: 0.5,
  brightness: 0,
  contrast: 1.0,
  offsetX: 0,
  offsetY: 0,
  offsetZ: 0,
  scale: 1.0,
  plane: "xy",
  sliceTextures: new Map(),
};

function requestSlice(index: number) {
  if (!worker) return;
  worker.postMessage({ type: "decode-slice", index });
}

function prefetchAround(z: number, sliceCount: number, cached: Map<number, Uint8Array>) {
  if (!worker) return;
  const start = Math.max(0, z - PREFETCH_RADIUS);
  const end = Math.min(sliceCount - 1, z + PREFETCH_RADIUS);

  // Only request uncached slices
  let needStart = -1;
  let needEnd = -1;
  for (let i = start; i <= end; i++) {
    if (!cached.has(i)) {
      if (needStart === -1) needStart = i;
      needEnd = i;
    }
  }

  if (needStart !== -1) {
    worker.postMessage({ type: "decode-range", start: needStart, end: needEnd });
  }
}

export const useImageStore = create<ImageStore>()((set, get) => ({
  ...initialState,

  loadTiff(file: File) {
    // Clean up previous worker
    if (worker) {
      worker.terminate();
      worker = null;
    }

    set({
      ...initialState,
      loading: true,
      fileName: file.name,
    });

    const reader = new FileReader();
    reader.onload = () => {
      const buffer = reader.result as ArrayBuffer;

      const w = new Worker(
        new URL("../workers/imageLoader.worker.ts", import.meta.url),
      );
      worker = w;

      w.onmessage = (e: MessageEvent) => {
        const msg = e.data;

        if (msg.type === "metadata") {
          let physicalPixelSize: ImageState["physicalPixelSize"] = null;

          if (msg.omeXml) {
            const ome = parseOmeXml(msg.omeXml);
            if (ome) {
              physicalPixelSize = {
                x: ome.physicalSizeX ?? 1,
                y: ome.physicalSizeY ?? 1,
                z: ome.physicalSizeZ ?? 1,
              };
            }
          }

          set({
            sliceCount: msg.sliceCount,
            width: msg.width,
            height: msg.height,
            bitDepth: msg.bitDepth,
            physicalPixelSize,
          });
        } else if (msg.type === "slice") {
          const state = get();
          const newCache = new Map(state.sliceTextures);
          newCache.set(msg.index, msg.rgba);

          const updates: Partial<ImageState> = { sliceTextures: newCache };

          // If this is the first slice (loading), mark as done
          if (state.loading && msg.index === 0) {
            updates.loading = false;
          }

          set(updates);
        } else if (msg.type === "error") {
          set({ loading: false, error: msg.message });
        }
      };

      w.onerror = () => {
        set({ loading: false, error: "Image loader worker failed" });
      };

      // Transfer the buffer to the worker (zero-copy)
      w.postMessage({ type: "load", buffer }, [buffer]);
    };

    reader.onerror = () => {
      set({ loading: false, error: "Failed to read image file" });
    };

    reader.readAsArrayBuffer(file);
  },

  setCurrentZ(z: number) {
    const state = get();
    const clamped = Math.max(0, Math.min(state.sliceCount - 1, z));
    if (clamped === state.currentZ) return;

    set({ currentZ: clamped });

    // Request slice if not cached
    if (!state.sliceTextures.has(clamped)) {
      requestSlice(clamped);
    }

    // Prefetch nearby slices
    prefetchAround(clamped, state.sliceCount, state.sliceTextures);
  },

  stepZ(delta: number) {
    const state = get();
    if (state.sliceCount === 0) return;
    get().setCurrentZ(state.currentZ + delta);
  },

  setVisible(v: boolean) {
    set({ visible: v });
  },

  setOpacity(v: number) {
    set({ opacity: Math.max(0, Math.min(1, v)) });
  },

  setBrightness(v: number) {
    set({ brightness: Math.max(-1, Math.min(1, v)) });
  },

  setContrast(v: number) {
    set({ contrast: Math.max(0, Math.min(3, v)) });
  },

  setOffset(x: number, y: number, z: number) {
    set({ offsetX: x, offsetY: y, offsetZ: z });
  },

  setScale(s: number) {
    set({ scale: Math.max(0.001, s) });
  },

  setPlane(p: ImageState["plane"]) {
    set({ plane: p });
  },

  clear() {
    if (worker) {
      worker.terminate();
      worker = null;
    }
    set({ ...initialState, sliceTextures: new Map() });
  },
}));
