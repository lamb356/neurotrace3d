"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { useNeuronStore } from "@/store/useNeuronStore";
import {
  captureAtResolution,
  renderDendrogramToCanvas,
  renderShollToCanvas,
  compositePublication,
} from "@/lib/publicationExport";
import type { PublicationExportConfig } from "@/lib/publicationExport";

export default function ScreenshotHelper() {
  const { gl, scene, camera } = useThree();

  useEffect(() => {
    function handleScreenshot() {
      gl.render(scene, camera);
      const dataUrl = gl.domElement.toDataURL("image/png");

      const fileName = useNeuronStore.getState().fileName ?? "neuron";
      const baseName = fileName.replace(/\.swc$/i, "");

      const link = document.createElement("a");
      link.download = `neurotrace3d-${baseName}.png`;
      link.href = dataUrl;
      link.click();
    }

    window.addEventListener("take-screenshot", handleScreenshot);
    return () => window.removeEventListener("take-screenshot", handleScreenshot);
  }, [gl, scene, camera]);

  // Publication export handler
  useEffect(() => {
    async function handlePublicationExport(e: Event) {
      const config = (e as CustomEvent<PublicationExportConfig>).detail;
      const store = useNeuronStore.getState();

      // Disable post-processing temporarily
      const savedPP = store.postProcessing;
      store.setPostProcessing("off");

      // Wait one tick for EffectComposer to unmount
      await new Promise((r) => setTimeout(r, 50));

      try {
        const { width, height, layout } = config;

        // Determine capture sizes based on layout
        let view3dW = width;
        let view3dH = height;
        let secondaryW = 0;
        let secondaryH = height;

        if (layout === "3d-dendrogram") {
          view3dW = Math.floor(width / 2);
          secondaryW = width - view3dW;
        } else if (layout === "3d-sholl") {
          view3dW = Math.floor(width * 0.6);
          secondaryW = width - view3dW;
        }

        // Capture 3D view
        const view3d = captureAtResolution(gl, scene, camera, view3dW, view3dH);

        // Generate secondary panel if needed
        let dendrogram: string | undefined;
        let sholl: string | undefined;

        if (layout === "3d-dendrogram" && secondaryW > 0) {
          dendrogram = renderDendrogramToCanvas(
            store.tree,
            store.childIndex,
            store.roots,
            secondaryW,
            secondaryH,
          );
        }

        if (layout === "3d-sholl" && secondaryW > 0) {
          sholl = renderShollToCanvas(
            store.tree,
            store.childIndex,
            store.roots,
            store.shollRadiusStep,
            secondaryW,
            secondaryH,
          );
        }

        // Collect types used in the tree
        const typesUsed = new Set<number>();
        for (const node of store.tree.values()) {
          typesUsed.add(node.type);
        }

        const blob = await compositePublication(
          config,
          { view3d, dendrogram, sholl },
          {
            fileName: store.fileName ?? "neuron",
            typesUsed: Array.from(typesUsed).sort(),
          },
        );

        window.dispatchEvent(new CustomEvent("publication-export-complete", { detail: { blob } }));
      } catch (err) {
        console.error("Publication export failed:", err);
      } finally {
        // Restore post-processing
        store.setPostProcessing(savedPP);
      }
    }

    window.addEventListener("start-publication-export", handlePublicationExport);
    return () => window.removeEventListener("start-publication-export", handlePublicationExport);
  }, [gl, scene, camera]);

  return null;
}
