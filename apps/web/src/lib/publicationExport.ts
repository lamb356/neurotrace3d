import type { Camera, WebGLRenderer, Scene } from "three";
import type { SWCNode } from "@neurotrace/swc-parser";
import { computeDendrogramLayout, type DendroNode } from "./dendrogram";
import { computeSholl, type ShollResult } from "./sholl";
import { getTypeColor, TYPE_LABELS } from "./colors";

export type JournalPreset = "nature-1col" | "nature-2col" | "cell-1col" | "elife" | "custom";

export const JOURNAL_PRESETS: Record<JournalPreset, { label: string; width: number; height: number }> = {
  "nature-1col": { label: "Nature (1-col)", width: 1051, height: 1051 },
  "nature-2col": { label: "Nature (2-col)", width: 2161, height: 1417 },
  "cell-1col": { label: "Cell (1-col)", width: 1004, height: 1004 },
  elife: { label: "eLife", width: 1795, height: 1181 },
  custom: { label: "Custom", width: 1920, height: 1080 },
};

export type LayoutMode = "3d-only" | "3d-dendrogram" | "3d-sholl";

export interface PublicationExportConfig {
  preset: JournalPreset;
  width: number;
  height: number;
  layout: LayoutMode;
  showScaleBar: boolean;
  showLegend: boolean;
  showFileName: boolean;
}

export const DEFAULT_PUB_CONFIG: PublicationExportConfig = {
  preset: "nature-1col",
  width: 1051,
  height: 1051,
  layout: "3d-only",
  showScaleBar: false,
  showLegend: true,
  showFileName: true,
};

/**
 * Capture the WebGL canvas at a specific resolution, then restore.
 * Returns a dataURL of the captured PNG.
 */
export function captureAtResolution(
  gl: WebGLRenderer,
  scene: Scene,
  camera: Camera,
  width: number,
  height: number,
): string {
  // Save original state
  const origWidth = gl.domElement.width;
  const origHeight = gl.domElement.height;
  const origPixelRatio = gl.getPixelRatio();

  // Resize
  gl.setPixelRatio(1);
  gl.setSize(width, height, false);

  // Update camera
  if ("isPerspectiveCamera" in camera && (camera as { isPerspectiveCamera: boolean }).isPerspectiveCamera) {
    const cam = camera as unknown as { aspect: number; updateProjectionMatrix: () => void };
    const origAspect = cam.aspect;
    cam.aspect = width / height;
    cam.updateProjectionMatrix();
    gl.render(scene, camera);
    const dataUrl = gl.domElement.toDataURL("image/png");
    cam.aspect = origAspect;
    cam.updateProjectionMatrix();
    // Restore
    gl.setPixelRatio(origPixelRatio);
    gl.setSize(origWidth, origHeight, false);
    return dataUrl;
  }

  if ("isOrthographicCamera" in camera && (camera as { isOrthographicCamera: boolean }).isOrthographicCamera) {
    const cam = camera as unknown as {
      top: number; bottom: number; left: number; right: number;
      updateProjectionMatrix: () => void;
    };
    const origLeft = cam.left, origRight = cam.right;
    const frustumHeight = cam.top - cam.bottom;
    const newAspect = width / height;
    const halfW = (frustumHeight * newAspect) / 2;
    cam.left = -halfW;
    cam.right = halfW;
    cam.updateProjectionMatrix();
    gl.render(scene, camera);
    const dataUrl = gl.domElement.toDataURL("image/png");
    cam.left = origLeft;
    cam.right = origRight;
    cam.updateProjectionMatrix();
    // Restore
    gl.setPixelRatio(origPixelRatio);
    gl.setSize(origWidth, origHeight, false);
    return dataUrl;
  }

  // Fallback
  gl.render(scene, camera);
  const dataUrl = gl.domElement.toDataURL("image/png");
  gl.setPixelRatio(origPixelRatio);
  gl.setSize(origWidth, origHeight, false);
  return dataUrl;
}

/**
 * Render dendrogram layout to a Canvas2D dataURL.
 */
export function renderDendrogramToCanvas(
  tree: Map<number, SWCNode>,
  childIndex: Map<number, number[]>,
  roots: number[],
  width: number,
  height: number,
): string {
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d")!;

  // Dark background
  ctx.fillStyle = "#0a1020";
  ctx.fillRect(0, 0, width, height);

  if (roots.length === 0) return canvasToDataURL(canvas, ctx, width, height);

  // Compute layout from first root
  const layout = computeDendrogramLayout(tree, childIndex, roots[0]);
  if (layout.size === 0) return canvasToDataURL(canvas, ctx, width, height);

  // Find bounds
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const node of layout.values()) {
    if (node.x < minX) minX = node.x;
    if (node.x > maxX) maxX = node.x;
    if (node.y < minY) minY = node.y;
    if (node.y > maxY) maxY = node.y;
  }

  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const pad = 40;

  function toCanvasX(x: number) {
    return pad + ((x - minX) / rangeX) * (width - pad * 2);
  }
  function toCanvasY(y: number) {
    return pad + ((y - minY) / rangeY) * (height - pad * 2);
  }

  // Draw L-shaped edges
  ctx.lineWidth = 1.2;
  for (const node of layout.values()) {
    if (node.parentId === -1) continue;
    const parent = layout.get(node.parentId);
    if (!parent) continue;

    ctx.strokeStyle = getTypeColor(node.type);
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    // L-shape: horizontal from parent.x to node.x at parent.y, then vertical to node.y
    ctx.moveTo(toCanvasX(parent.x), toCanvasY(parent.y));
    ctx.lineTo(toCanvasX(node.x), toCanvasY(parent.y));
    ctx.lineTo(toCanvasX(node.x), toCanvasY(node.y));
    ctx.stroke();
  }

  // Draw node circles
  ctx.globalAlpha = 1;
  for (const node of layout.values()) {
    if (node.isBranch || node.isLeaf) {
      ctx.fillStyle = getTypeColor(node.type);
      ctx.beginPath();
      ctx.arc(toCanvasX(node.x), toCanvasY(node.y), node.isBranch ? 3 : 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Label
  ctx.fillStyle = "#ffffff";
  ctx.font = "12px sans-serif";
  ctx.globalAlpha = 0.7;
  ctx.fillText("Dendrogram", pad, height - 12);

  return canvasToDataURL(canvas, ctx, width, height);
}

/**
 * Render Sholl analysis as a line chart to a Canvas2D dataURL.
 */
export function renderShollToCanvas(
  tree: Map<number, SWCNode>,
  childIndex: Map<number, number[]>,
  roots: number[],
  shollRadiusStep: number,
  width: number,
  height: number,
): string {
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#0a1020";
  ctx.fillRect(0, 0, width, height);

  const data = computeSholl(tree, childIndex, roots, shollRadiusStep);
  if (data.length === 0) return canvasToDataURL(canvas, ctx, width, height);

  const maxR = data[data.length - 1].radius;
  const maxI = Math.max(...data.map((d) => d.intersections), 1);

  const pad = 50;
  const chartW = width - pad * 2;
  const chartH = height - pad * 2;

  // Axes
  ctx.strokeStyle = "#4a5568";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, pad);
  ctx.lineTo(pad, pad + chartH);
  ctx.lineTo(pad + chartW, pad + chartH);
  ctx.stroke();

  // Data line
  ctx.strokeStyle = "#4a9eda";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < data.length; i++) {
    const x = pad + (data[i].radius / maxR) * chartW;
    const y = pad + chartH - (data[i].intersections / maxI) * chartH;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Fill under curve
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = "#4a9eda";
  ctx.lineTo(pad + chartW, pad + chartH);
  ctx.lineTo(pad, pad + chartH);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  // Labels
  ctx.fillStyle = "#ffffff";
  ctx.font = "12px sans-serif";
  ctx.globalAlpha = 0.7;
  ctx.fillText("Sholl Analysis", pad, pad - 10);
  ctx.fillText(`Radius (µm)`, pad + chartW / 2 - 30, pad + chartH + 35);
  ctx.save();
  ctx.translate(15, pad + chartH / 2 + 30);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("Intersections", 0, 0);
  ctx.restore();
  ctx.globalAlpha = 1;

  return canvasToDataURL(canvas, ctx, width, height);
}

/**
 * Composite multiple captures into a publication-ready PNG.
 */
export async function compositePublication(
  config: PublicationExportConfig,
  captures: {
    view3d: string;
    dendrogram?: string;
    sholl?: string;
  },
  metadata: {
    fileName: string;
    typesUsed: number[];
  },
): Promise<Blob> {
  const { width, height, layout, showLegend, showFileName } = config;

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d")!;

  // Dark background
  ctx.fillStyle = "#070d1a";
  ctx.fillRect(0, 0, width, height);

  // Layout regions
  let view3dRect: { x: number; y: number; w: number; h: number };
  let secondaryRect: { x: number; y: number; w: number; h: number } | null = null;

  if (layout === "3d-only") {
    view3dRect = { x: 0, y: 0, w: width, h: height };
  } else if (layout === "3d-dendrogram") {
    // 50/50 split
    const half = Math.floor(width / 2);
    view3dRect = { x: 0, y: 0, w: half, h: height };
    secondaryRect = { x: half, y: 0, w: width - half, h: height };
  } else {
    // 3d-sholl: 60/40 split
    const main = Math.floor(width * 0.6);
    view3dRect = { x: 0, y: 0, w: main, h: height };
    secondaryRect = { x: main, y: 0, w: width - main, h: height };
  }

  // Draw 3D view
  const img3d = await loadImage(captures.view3d);
  drawImageFit(ctx, img3d, view3dRect);

  // Draw secondary panel
  if (secondaryRect) {
    const secondaryData =
      layout === "3d-dendrogram" ? captures.dendrogram : captures.sholl;
    if (secondaryData) {
      const imgSec = await loadImage(secondaryData);
      drawImageFit(ctx, imgSec, secondaryRect);
    }

    // Separator line
    ctx.strokeStyle = "#2a3a4a";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(secondaryRect.x, 0);
    ctx.lineTo(secondaryRect.x, height);
    ctx.stroke();
  }

  // Overlays
  const overlayPad = 16;

  if (showFileName && metadata.fileName) {
    ctx.fillStyle = "#ffffff";
    ctx.globalAlpha = 0.85;
    ctx.font = "bold 14px sans-serif";
    const baseName = metadata.fileName.replace(/\.swc$/i, "");
    ctx.fillText(baseName, overlayPad, overlayPad + 14);
    ctx.globalAlpha = 1;
  }

  if (showLegend && metadata.typesUsed.length > 0) {
    const legendX = overlayPad;
    let legendY = height - overlayPad - metadata.typesUsed.length * 18;

    ctx.globalAlpha = 0.7;
    ctx.fillStyle = "#000000";
    const legendW = 140;
    const legendH = metadata.typesUsed.length * 18 + 12;
    ctx.fillRect(legendX - 4, legendY - 14, legendW, legendH);
    ctx.globalAlpha = 1;

    ctx.font = "12px sans-serif";
    for (const type of metadata.typesUsed) {
      ctx.fillStyle = getTypeColor(type);
      ctx.fillRect(legendX, legendY - 6, 10, 10);
      ctx.fillStyle = "#ffffff";
      ctx.globalAlpha = 0.9;
      ctx.fillText(TYPE_LABELS[type] ?? `Type ${type}`, legendX + 16, legendY + 3);
      ctx.globalAlpha = 1;
      legendY += 18;
    }
  }

  return await canvas.convertToBlob({ type: "image/png" });
}

// --- Helpers ---

function canvasToDataURL(canvas: OffscreenCanvas, _ctx: OffscreenCanvasRenderingContext2D, _w: number, _h: number): string {
  // OffscreenCanvas doesn't have toDataURL; read pixels and convert
  // Use a regular canvas for dataURL conversion
  const tmpCanvas = document.createElement("canvas");
  tmpCanvas.width = canvas.width;
  tmpCanvas.height = canvas.height;
  const tmpCtx = tmpCanvas.getContext("2d")!;
  tmpCtx.drawImage(canvas as unknown as ImageBitmapSource as CanvasImageSource, 0, 0);
  return tmpCanvas.toDataURL("image/png");
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function drawImageFit(
  ctx: OffscreenCanvasRenderingContext2D,
  img: HTMLImageElement,
  rect: { x: number; y: number; w: number; h: number },
) {
  // Fill the rect, preserving aspect ratio (cover)
  const imgAspect = img.width / img.height;
  const rectAspect = rect.w / rect.h;

  let sx = 0, sy = 0, sw = img.width, sh = img.height;
  if (imgAspect > rectAspect) {
    // Image wider than rect: crop sides
    sw = img.height * rectAspect;
    sx = (img.width - sw) / 2;
  } else {
    // Image taller than rect: crop top/bottom
    sh = img.width / rectAspect;
    sy = (img.height - sh) / 2;
  }

  ctx.drawImage(img, sx, sy, sw, sh, rect.x, rect.y, rect.w, rect.h);
}
