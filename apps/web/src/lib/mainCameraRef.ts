import type { Camera } from "three";

/** Shared ref for accessing the main canvas camera from the minimap */
export const mainCameraRef: { current: Camera | null } = { current: null };
