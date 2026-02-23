export interface MorphometricsResult {
  totalLength: number;
  totalSurface: number;
  totalVolume: number;
  branchCount: number;
  tipCount: number;
  maxStrahlerOrder: number;
  branchAngles: number[];
  tipPathLengths: number[];
  segmentTortuosity: { nodeId: number; value: number }[];
  convexHullVolume: number;
  fractalDimension: number;
}
