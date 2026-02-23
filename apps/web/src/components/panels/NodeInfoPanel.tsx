"use client";

import { useNeuronStore } from "@/store/useNeuronStore";
import { getTypeColor, getTypeLabel } from "@/lib/colors";
import { getBranchOrder, getPathToSoma } from "@/lib/morphometrics";

function NodeTag({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
      style={{ background: color + "22", color }}
    >
      {label}
    </span>
  );
}

function getNodeRole(
  nodeId: number,
  parentId: number,
  childIndex: Map<number, number[]>,
): "ROOT" | "TIP" | "BRANCH" | null {
  if (parentId === -1) return "ROOT";
  const children = childIndex.get(nodeId) ?? [];
  if (children.length === 0) return "TIP";
  if (children.length >= 2) return "BRANCH";
  return null;
}

function subtreeSize(
  nodeId: number,
  childIndex: Map<number, number[]>,
): number {
  let count = 1;
  const queue = [nodeId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const children = childIndex.get(current) ?? [];
    count += children.length;
    queue.push(...children);
  }
  return count;
}

export default function NodeInfoPanel() {
  const tree = useNeuronStore((s) => s.tree);
  const childIndex = useNeuronStore((s) => s.childIndex);
  const selection = useNeuronStore((s) => s.selection);

  if (selection.size === 0) return null;

  const ids = Array.from(selection);

  if (ids.length === 1) {
    const node = tree.get(ids[0]);
    if (!node) return null;

    const children = childIndex.get(node.id) ?? [];
    const role = getNodeRole(node.id, node.parentId, childIndex);
    const typeColor = getTypeColor(node.type);
    const branchOrder = getBranchOrder(tree, childIndex, node.id);
    const pathToSoma = getPathToSoma(tree, node.id);
    const subSize = subtreeSize(node.id, childIndex);

    return (
      <div className="flex flex-col gap-3">
        {/* Header with type badge */}
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-3 w-3 rounded-full"
            style={{ background: typeColor }}
          />
          <h3 className="text-sm font-semibold">{getTypeLabel(node.type)}</h3>
          {role && (
            <NodeTag
              label={role}
              color={
                role === "ROOT" ? "#e05252" : role === "TIP" ? "#4a9eda" : "#f4a261"
              }
            />
          )}
        </div>

        {/* POSITION */}
        <Section title="POSITION">
          <div className="grid grid-cols-4 gap-x-2 gap-y-1">
            <NumField label="X" value={node.x.toFixed(2)} unit="µm" />
            <NumField label="Y" value={node.y.toFixed(2)} unit="µm" />
            <NumField label="Z" value={node.z.toFixed(2)} unit="µm" />
            <NumField label="R" value={node.radius.toFixed(2)} unit="µm" />
          </div>
        </Section>

        {/* TOPOLOGY */}
        <Section title="TOPOLOGY">
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            <InfoField label="Node ID" value={String(node.id)} />
            <InfoField
              label="Parent"
              value={node.parentId === -1 ? "root" : String(node.parentId)}
            />
            <InfoField label="Children" value={String(children.length)} />
            <InfoField label="Subtree" value={String(subSize)} />
          </div>
        </Section>

        {/* MORPHOMETRICS */}
        <Section title="MORPHOMETRICS">
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            <NumField label="Branch Order" value={String(branchOrder)} />
            <NumField label="Path to Soma" value={pathToSoma.toFixed(1)} unit="µm" />
          </div>
        </Section>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold uppercase tracking-wider">
        Selected ({ids.length} nodes)
      </h3>
      <div className="text-text-muted flex flex-wrap gap-1 text-xs">
        {ids.slice(0, 20).map((id) => (
          <span key={id} className="bg-bg rounded border border-border px-1.5 py-0.5 numeric">
            {id}
          </span>
        ))}
        {ids.length > 20 && <span>+{ids.length - 20} more</span>}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-text-muted mb-1 text-[10px] font-semibold uppercase tracking-widest">
        {title}
      </p>
      {children}
    </div>
  );
}

function NumField({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div>
      <p className="text-text-muted text-[10px]">{label}</p>
      <p className="numeric text-sm font-medium">
        {value}
        {unit && <span className="text-text-muted ml-0.5 text-[10px]">{unit}</span>}
      </p>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-text-muted text-[10px]">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
