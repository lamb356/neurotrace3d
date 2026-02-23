"use client";

import { useNeuronStore } from "@/store/useNeuronStore";
import { getTypeColor, getTypeLabel } from "@/lib/colors";

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
    return (
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wider">Selected Node</h3>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
          <Field label="ID" value={String(node.id)} />
          <Field
            label="Type"
            value={getTypeLabel(node.type)}
            color={getTypeColor(node.type)}
          />
          <Field label="X" value={node.x.toFixed(2)} />
          <Field label="Y" value={node.y.toFixed(2)} />
          <Field label="Z" value={node.z.toFixed(2)} />
          <Field label="Radius" value={node.radius.toFixed(2)} />
          <Field label="Parent" value={node.parentId === -1 ? "root" : String(node.parentId)} />
          <Field label="Children" value={String(children.length)} />
        </div>
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
          <span key={id} className="bg-bg rounded border border-border px-1.5 py-0.5">
            {id}
          </span>
        ))}
        {ids.length > 20 && <span>+{ids.length - 20} more</span>}
      </div>
    </div>
  );
}

function Field({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <p className="text-text-muted text-xs">{label}</p>
      <p className="font-medium" style={color ? { color } : undefined}>
        {value}
      </p>
    </div>
  );
}
