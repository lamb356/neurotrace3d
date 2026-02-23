declare module "n8ao" {
  import { Scene, Camera } from "three";
  import { Pass } from "three/examples/jsm/postprocessing/Pass.js";

  export class N8AOPostPass extends Pass {
    constructor(scene: Scene, camera: Camera, width?: number, height?: number);
    configuration: {
      aoRadius: number;
      intensity: number;
      halfRes: boolean;
      aoSamples: number;
      denoiseSamples: number;
      denoiseRadius: number;
      distanceFalloff: number;
      color: import("three").Color;
    };
    setSize(width: number, height: number): void;
    dispose(): void;
  }
}
