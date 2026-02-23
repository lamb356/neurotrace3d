import { Vector3 } from "three";
import type { Camera } from "three";
import type { SWCNode } from "@neurotrace/swc-parser";
import { getTypeColor } from "./colors";

export interface SVGExportOptions {
  width: number;
  height: number;
  background: string;
  showSoma: boolean;
  depthCueing: boolean;
  scaleBar: boolean;
}

const DEFAULTS: SVGExportOptions = {
  width: 1920,
  height: 1080,
  background: "#070d1a",
  showSoma: true,
  depthCueing: true,
  scaleBar: false,
};

interface ProjectedEdge {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  avgZ: number;
  color: string;
  opacity: number;
  strokeWidth: number;
}

/**
 * Export the current neuron view as an SVG string.
 * Projects 3D coordinates through the given camera to produce a 2D vector image.
 */
export function exportToSVG(
  tree: Map<number, SWCNode>,
  childIndex: Map<number, number[]>,
  camera: Camera,
  options?: Partial<SVGExportOptions>,
): string {
  const opts = { ...DEFAULTS, ...options };
  const { width, height, background, showSoma, depthCueing } = opts;

  // Ensure camera matrices are up to date (demand mode doesn't auto-update)
  camera.updateMatrixWorld();

  const v = new Vector3();

  // Project a 3D point to SVG coordinates
  function project(x: number, y: number, z: number): { sx: number; sy: number; nz: number } {
    v.set(x, y, z).project(camera);
    return {
      sx: ((v.x + 1) / 2) * width,
      sy: ((1 - v.y) / 2) * height,
      nz: v.z, // NDC z: -1 far, +1 near
    };
  }

  // Build projected edges
  const edges: ProjectedEdge[] = [];
  const somaCircles: Array<{ cx: number; cy: number; r: number; color: string; opacity: number }> = [];

  for (const [id, node] of tree) {
    // Soma circles
    if (showSoma && node.type === 1) {
      const p = project(node.x, node.y, node.z);
      const opacity = depthCueing ? mapRange(p.nz, -1, 1, 0.3, 1.0) : 1.0;
      somaCircles.push({
        cx: p.sx,
        cy: p.sy,
        r: Math.max(3, node.radius * 0.8),
        color: getTypeColor(node.type),
        opacity,
      });
    }

    // Edges (each node connects to its parent)
    if (node.parentId === -1) continue;
    const parent = tree.get(node.parentId);
    if (!parent) continue;

    const p1 = project(parent.x, parent.y, parent.z);
    const p2 = project(node.x, node.y, node.z);
    const avgZ = (p1.nz + p2.nz) / 2;

    const opacity = depthCueing ? mapRange(avgZ, -1, 1, 0.3, 1.0) : 1.0;
    const strokeWidth = depthCueing ? mapRange(avgZ, -1, 1, 0.5, 1.8) : 1.2;

    edges.push({
      x1: p1.sx,
      y1: p1.sy,
      x2: p2.sx,
      y2: p2.sy,
      avgZ,
      color: getTypeColor(node.type),
      opacity,
      strokeWidth,
    });
  }

  // Sort edges back-to-front (far = low avgZ → near = high avgZ)
  edges.sort((a, b) => a.avgZ - b.avgZ);

  // Build SVG
  const lines: string[] = [];
  lines.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`);
  lines.push(`  <rect width="${width}" height="${height}" fill="${background}" />`);

  // Edges
  for (const e of edges) {
    lines.push(
      `  <line x1="${e.x1.toFixed(1)}" y1="${e.y1.toFixed(1)}" x2="${e.x2.toFixed(1)}" y2="${e.y2.toFixed(1)}" stroke="${e.color}" stroke-width="${e.strokeWidth.toFixed(2)}" opacity="${e.opacity.toFixed(2)}" stroke-linecap="round" />`,
    );
  }

  // Soma circles (drawn on top)
  for (const s of somaCircles) {
    lines.push(
      `  <circle cx="${s.cx.toFixed(1)}" cy="${s.cy.toFixed(1)}" r="${s.r.toFixed(1)}" fill="${s.color}" opacity="${s.opacity.toFixed(2)}" />`,
    );
  }

  // Scale bar for orthographic cameras
  if (opts.scaleBar && isOrthographic(camera)) {
    const barSvg = renderScaleBar(camera, width, height);
    if (barSvg) lines.push(barSvg);
  }

  lines.push("</svg>");
  return lines.join("\n");
}

/** Download an SVG string as a file */
export function downloadSVG(svgString: string, fileName: string): void {
  const blob = new Blob([svgString], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

// --- Helpers ---

function mapRange(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  const t = Math.max(0, Math.min(1, (value - inMin) / (inMax - inMin)));
  return outMin + t * (outMax - outMin);
}

function isOrthographic(camera: Camera): boolean {
  return "isOrthographicCamera" in camera && (camera as { isOrthographicCamera: boolean }).isOrthographicCamera;
}

function renderScaleBar(camera: Camera, svgWidth: number, svgHeight: number): string | null {
  // For orthographic cameras, compute world-units per pixel
  const ortho = camera as unknown as { top: number; bottom: number; zoom: number };
  if (ortho.top === undefined || ortho.bottom === undefined) return null;

  const frustumHeight = (ortho.top - ortho.bottom) / (ortho.zoom || 1);
  const worldPerPx = frustumHeight / svgHeight;

  // Target: bar ~150px wide, choose nice round number of µm
  const targetWorld = worldPerPx * 150;
  const niceValues = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
  let barWorld = niceValues[0];
  for (const v of niceValues) {
    if (v >= targetWorld * 0.5) {
      barWorld = v;
      break;
    }
  }

  const barPx = barWorld / worldPerPx;
  const x = svgWidth - barPx - 30;
  const y = svgHeight - 30;

  return [
    `  <line x1="${x.toFixed(1)}" y1="${y}" x2="${(x + barPx).toFixed(1)}" y2="${y}" stroke="white" stroke-width="2" />`,
    `  <line x1="${x.toFixed(1)}" y1="${y - 4}" x2="${x.toFixed(1)}" y2="${y + 4}" stroke="white" stroke-width="2" />`,
    `  <line x1="${(x + barPx).toFixed(1)}" y1="${y - 4}" x2="${(x + barPx).toFixed(1)}" y2="${y + 4}" stroke="white" stroke-width="2" />`,
    `  <text x="${(x + barPx / 2).toFixed(1)}" y="${y - 8}" fill="white" font-size="12" text-anchor="middle" font-family="sans-serif">${barWorld} µm</text>`,
  ].join("\n");
}
