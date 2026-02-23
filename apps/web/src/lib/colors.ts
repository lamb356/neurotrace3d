import { Color } from "three";

/** SWC type code → hex color string (desaturated scientific palette) */
export const TYPE_COLORS: Record<number, string> = {
  1: "#e05252", // soma
  2: "#4a9eda", // axon
  3: "#52b788", // basal dendrite
  4: "#b07ec8", // apical dendrite
  5: "#f4a261", // custom 5
  6: "#e9c46a", // custom 6
  7: "#a8c8a0", // custom 7
};

const DEFAULT_COLOR = "#7b8fa6";

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
