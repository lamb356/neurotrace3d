"use client";

import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import { useNeuronStore } from "@/store/useNeuronStore";
import { computeDendrogramLayout, type DendroNode } from "@/lib/dendrogram";
import { getTypeColor } from "@/lib/colors";

const NODE_RADIUS = 2.5;
const HIT_RADIUS = 5;
const PADDING = 20;
const CANVAS_THRESHOLD = 20_000;

export default function DendrogramPanel() {
  const tree = useNeuronStore((s) => s.tree);
  const childIndex = useNeuronStore((s) => s.childIndex);
  const roots = useNeuronStore((s) => s.roots);
  const selection = useNeuronStore((s) => s.selection);
  const hovered = useNeuronStore((s) => s.hovered);
  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const layout = useMemo(() => {
    if (tree.size === 0 || roots.length === 0) return null;
    return computeDendrogramLayout(tree, childIndex, roots[0]);
  }, [tree, childIndex, roots]);

  if (tree.size === 0 || !layout || layout.size === 0) return null;

  const useCanvas = layout.size > CANVAS_THRESHOLD;
  const panelHeight = expanded ? "h-96" : "h-60";

  return (
    <div className="flex flex-col gap-2">
      <button
        className="flex w-full items-center gap-1.5 text-left"
        onClick={() => setCollapsed((c) => !c)}
      >
        <svg
          className="h-3 w-3 transition-transform duration-200"
          style={{ transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)" }}
          viewBox="0 0 12 12"
          fill="currentColor"
        >
          <path d="M3 2l6 4-6 4z" />
        </svg>
        <h3 className="text-sm font-semibold uppercase tracking-wider">
          Dendrogram
        </h3>
      </button>

      {!collapsed && (
        <>
          <div className={`${panelHeight} w-full overflow-hidden rounded border border-border`}>
            {useCanvas ? (
              <CanvasDendrogram layout={layout} selection={selection} hovered={hovered} />
            ) : (
              <SVGDendrogram layout={layout} selection={selection} hovered={hovered} />
            )}
          </div>
          <button
            className="border-border bg-surface hover:bg-surface-hover rounded border px-3 py-1.5 text-xs transition-colors"
            onClick={() => setExpanded((e) => !e)}
          >
            {expanded ? "Collapse" : "Expand"}
          </button>
        </>
      )}
    </div>
  );
}

/* ── SVG Dendrogram (≤20K nodes) ───────────────────────────────── */

function SVGDendrogram({
  layout,
  selection,
  hovered,
}: {
  layout: Map<number, DendroNode>;
  selection: Set<number>;
  hovered: number | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ width: 300, height: 240 });
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const dragRef = useRef<{ startX: number; startY: number; tx: number; ty: number } | null>(null);

  // Compute data extents
  const extents = useMemo(() => {
    let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
    for (const n of layout.values()) {
      if (n.x < xMin) xMin = n.x;
      if (n.x > xMax) xMax = n.x;
      if (n.y < yMin) yMin = n.y;
      if (n.y > yMax) yMax = n.y;
    }
    return { xMin, xMax, yMin, yMax };
  }, [layout]);

  // ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setDims({ width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Reset view when layout changes
  useEffect(() => {
    setTranslate({ x: 0, y: 0 });
    setScale(1);
  }, [layout]);

  const dataW = extents.xMax - extents.xMin || 1;
  const dataH = extents.yMax - extents.yMin || 1;

  // Scale data to fit with padding
  const scaleX = (dims.width - PADDING * 2) / dataW;
  const scaleY = (dims.height - PADDING * 2) / dataH;
  const fitScale = Math.min(scaleX, scaleY);

  const toScreenX = (x: number) => PADDING + (x - extents.xMin) * fitScale;
  const toScreenY = (y: number) => PADDING + (y - extents.yMin) * fitScale;

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    setScale((s) => Math.max(0.1, Math.min(20, s * factor)));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    dragRef.current = { startX: e.clientX, startY: e.clientY, tx: translate.x, ty: translate.y };
  }, [translate]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setTranslate({ x: dragRef.current.tx + dx, y: dragRef.current.ty + dy });
  }, []);

  const handleMouseUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const handleClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    // Only handle clicks on nodes (circles), not background panning
    const target = e.target as Element;
    const nodeId = target.getAttribute?.("data-node-id");
    if (nodeId) {
      useNeuronStore.getState().selectNode(Number(nodeId));
    }
  }, []);

  // Build L-shaped path segments
  const edges: { key: string; d: string; color: string }[] = [];
  const nodes: { id: number; cx: number; cy: number; color: string; selected: boolean; isHovered: boolean }[] = [];

  for (const node of layout.values()) {
    const cx = toScreenX(node.x);
    const cy = toScreenY(node.y);
    const color = getTypeColor(node.type);
    const selected = selection.has(node.id);
    const isHovered = hovered === node.id;

    nodes.push({ id: node.id, cx, cy, color, selected, isHovered });

    // Draw L-shaped edge from parent
    if (node.parentId !== -1) {
      const parent = layout.get(node.parentId);
      if (parent) {
        const px = toScreenX(parent.x);
        const py = toScreenY(parent.y);
        // Horizontal from parent.x at parent.y, then vertical to node.y
        edges.push({
          key: `${node.parentId}-${node.id}`,
          d: `M ${px} ${py} H ${cx} V ${cy}`,
          color,
        });
      }
    }
  }

  const viewBox = `0 0 ${dims.width} ${dims.height}`;

  return (
    <div ref={containerRef} className="h-full w-full bg-bg">
      <svg
        width={dims.width}
        height={dims.height}
        viewBox={viewBox}
        className="h-full w-full"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
        style={{ cursor: dragRef.current ? "grabbing" : "grab" }}
      >
        <g transform={`translate(${translate.x}, ${translate.y}) scale(${scale})`}>
          {/* Edges */}
          {edges.map((e) => (
            <path
              key={e.key}
              d={e.d}
              stroke={e.color}
              strokeWidth={1}
              fill="none"
              opacity={0.7}
            />
          ))}
          {/* Nodes */}
          {nodes.map((n) => (
            <circle
              key={n.id}
              data-node-id={n.id}
              cx={n.cx}
              cy={n.cy}
              r={n.selected ? NODE_RADIUS * 1.6 : NODE_RADIUS}
              fill={n.color}
              stroke={n.selected ? "#e67e22" : n.isHovered ? "#f1c40f" : "none"}
              strokeWidth={n.selected || n.isHovered ? 1.5 : 0}
              className="cursor-pointer"
            />
          ))}
        </g>
      </svg>
    </div>
  );
}

/* ── Canvas Dendrogram (>20K nodes) ────────────────────────────── */

function CanvasDendrogram({
  layout,
  selection,
  hovered,
}: {
  layout: Map<number, DendroNode>;
  selection: Set<number>;
  hovered: number | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ width: 300, height: 240 });
  const translateRef = useRef({ x: 0, y: 0 });
  const scaleRef = useRef(1);
  const dragRef = useRef<{ startX: number; startY: number; tx: number; ty: number } | null>(null);

  // ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setDims({ width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Compute extents
  const extents = useMemo(() => {
    let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
    for (const n of layout.values()) {
      if (n.x < xMin) xMin = n.x;
      if (n.x > xMax) xMax = n.x;
      if (n.y < yMin) yMin = n.y;
      if (n.y > yMax) yMax = n.y;
    }
    return { xMin, xMax, yMin, yMax };
  }, [layout]);

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = dims.width * window.devicePixelRatio;
    canvas.height = dims.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const dataW = extents.xMax - extents.xMin || 1;
    const dataH = extents.yMax - extents.yMin || 1;
    const scaleX = (dims.width - PADDING * 2) / dataW;
    const scaleY = (dims.height - PADDING * 2) / dataH;
    const fitScale = Math.min(scaleX, scaleY);

    const tx = translateRef.current.x;
    const ty = translateRef.current.y;
    const s = scaleRef.current;

    const toX = (x: number) => (PADDING + (x - extents.xMin) * fitScale) * s + tx;
    const toY = (y: number) => (PADDING + (y - extents.yMin) * fitScale) * s + ty;

    // Clear
    ctx.clearRect(0, 0, dims.width, dims.height);
    ctx.fillStyle = "var(--color-bg, #070d1a)";
    ctx.fillRect(0, 0, dims.width, dims.height);

    // Draw edges
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.7;
    for (const node of layout.values()) {
      if (node.parentId === -1) continue;
      const parent = layout.get(node.parentId);
      if (!parent) continue;
      const px = toX(parent.x);
      const py = toY(parent.y);
      const cx = toX(node.x);
      const cy = toY(node.y);
      ctx.strokeStyle = getTypeColor(node.type);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(cx, py);
      ctx.lineTo(cx, cy);
      ctx.stroke();
    }

    // Draw nodes
    ctx.globalAlpha = 1;
    for (const node of layout.values()) {
      const cx = toX(node.x);
      const cy = toY(node.y);
      const isSelected = selection.has(node.id);
      const isHov = hovered === node.id;
      const r = isSelected ? NODE_RADIUS * 1.6 : NODE_RADIUS;

      ctx.fillStyle = getTypeColor(node.type);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

      if (isSelected) {
        ctx.strokeStyle = "#e67e22";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else if (isHov) {
        ctx.strokeStyle = "#f1c40f";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
  }, [layout, dims, selection, hovered, extents]);

  // Click hit detection
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const dataW = extents.xMax - extents.xMin || 1;
    const dataH = extents.yMax - extents.yMin || 1;
    const scaleX = (dims.width - PADDING * 2) / dataW;
    const scaleY = (dims.height - PADDING * 2) / dataH;
    const fitScale = Math.min(scaleX, scaleY);
    const tx = translateRef.current.x;
    const ty = translateRef.current.y;
    const s = scaleRef.current;

    const toX = (x: number) => (PADDING + (x - extents.xMin) * fitScale) * s + tx;
    const toY = (y: number) => (PADDING + (y - extents.yMin) * fitScale) * s + ty;

    let closest: number | null = null;
    let closestDist = HIT_RADIUS * HIT_RADIUS;
    for (const node of layout.values()) {
      const cx = toX(node.x);
      const cy = toY(node.y);
      const dx = mx - cx;
      const dy = my - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 < closestDist) {
        closestDist = d2;
        closest = node.id;
      }
    }

    if (closest !== null) {
      useNeuronStore.getState().selectNode(closest);
    }
  }, [layout, dims, extents]);

  // Pan & zoom handlers
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    scaleRef.current = Math.max(0.1, Math.min(20, scaleRef.current * factor));
    // Trigger re-render by forcing layout deps (already handled by effect)
    setDims((d) => ({ ...d }));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      tx: translateRef.current.x,
      ty: translateRef.current.y,
    };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragRef.current) return;
    translateRef.current = {
      x: dragRef.current.tx + (e.clientX - dragRef.current.startX),
      y: dragRef.current.ty + (e.clientY - dragRef.current.startY),
    };
    setDims((d) => ({ ...d }));
  }, []);

  const handleMouseUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  return (
    <div ref={containerRef} className="h-full w-full bg-bg">
      <canvas
        ref={canvasRef}
        style={{ width: dims.width, height: dims.height, cursor: "grab" }}
        onClick={handleClick}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    </div>
  );
}
