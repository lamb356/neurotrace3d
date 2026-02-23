"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { useNeuronStore } from "@/store/useNeuronStore";

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

  return null;
}
