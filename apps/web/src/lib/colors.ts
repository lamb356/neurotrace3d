import { Color } from "three";

/** SWC type code → hex color string */
export const TYPE_COLORS: Record<number, string> = {
  1: "#e74c3c", // soma
  2: "#3498db", // axon
  3: "#2ecc71", // basal dendrite
  4: "#9b59b6", // apical dendrite
};

const DEFAULT_COLOR = "#95a5a6";

/** SWC type code → human-readable label */
export const TYPE_LABELS: Record<number, string> = {
  0: "Undefined",
  1: "Soma",
  2: "Axon",
  3: "Basal Dendrite",
  4: "Apical Dendrite",
  5: "Custom 5",
  6: "Custom 6",
  7: "Custom 7",
};

export function getTypeColor(typeCode: number): string {
  return TYPE_COLORS[typeCode] ?? DEFAULT_COLOR;
}

export function getTypeLabel(typeCode: number): string {
  return TYPE_LABELS[typeCode] ?? `Type ${typeCode}`;
}

const colorCache = new Map<number, Color>();

export function getTypeThreeColor(typeCode: number): Color {
  let c = colorCache.get(typeCode);
  if (!c) {
    c = new Color(getTypeColor(typeCode));
    colorCache.set(typeCode, c);
  }
  return c;
}

export const HIGHLIGHT_COLOR = new Color("#f1c40f");
export const SELECT_COLOR = new Color("#e67e22");
export const NAV_CURSOR_COLOR = new Color("#00bcd4");
