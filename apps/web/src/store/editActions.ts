import type { SWCNode } from "@neurotrace/swc-parser";
import type { TreeOp } from "./operations";
import type { NeuronState } from "./types";

/** Create ops to move a node to a new position */
export function createMoveOps(
  tree: Map<number, SWCNode>,
  id: number,
  x: number,
  y: number,
  z: number,
): TreeOp[] {
  const node = tree.get(id);
  if (!node) return [];
  return [
    {
      type: "MOVE",
      nodeId: id,
      before: { x: node.x, y: node.y, z: node.z },
      after: { x, y, z },
    },
  ];
}

/** Create ops to delete nodes and reparent their children */
export function createDeleteOps(
  state: NeuronState,
  ids: number[],
): TreeOp[] {
  const ops: TreeOp[] = [];
  const toDelete = new Set(ids);

  // Sort by depth (leaves first) to avoid parent-before-child issues
  const sorted = [...ids].sort((a, b) => {
    return getDepth(state.tree, b) - getDepth(state.tree, a);
  });

  for (const id of sorted) {
    const node = state.tree.get(id);
    if (!node) continue;

    // Reparent children to the deleted node's parent
    const children = state.childIndex.get(id) ?? [];
    for (const childId of children) {
      if (toDelete.has(childId)) continue; // will be deleted too
      const child = state.tree.get(childId);
      if (!child) continue;
      ops.push({
        type: "REPARENT",
        nodeId: childId,
        before: { parentId: child.parentId },
        after: { parentId: node.parentId },
      });
    }

    // Delete the node
    ops.push({
      type: "DELETE",
      nodeId: id,
      before: {},
      after: {},
      nodeSnapshot: { ...node },
    });
  }

  return ops;
}

/** Create ops to insert a new node between a parent and child */
export function createInsertOps(
  tree: Map<number, SWCNode>,
  parentId: number,
  childId: number,
  position: { x: number; y: number; z: number },
): TreeOp[] {
  const parent = tree.get(parentId);
  const child = tree.get(childId);
  if (!parent || !child) return [];

  // Generate a new unique ID
  let maxId = 0;
  for (const id of tree.keys()) {
    if (id > maxId) maxId = id;
  }
  const newId = maxId + 1;

  const newNode: SWCNode = {
    id: newId,
    type: parent.type,
    x: position.x,
    y: position.y,
    z: position.z,
    radius: (parent.radius + child.radius) / 2,
    parentId,
  };

  return [
    // Insert the new node
    {
      type: "INSERT",
      nodeId: newId,
      before: {},
      after: { ...newNode },
      nodeSnapshot: newNode,
    },
    // Reparent the child to the new node
    {
      type: "REPARENT",
      nodeId: childId,
      before: { parentId: child.parentId },
      after: { parentId: newId },
    },
  ];
}

/** Create ops to change the type of nodes */
export function createRetypeOps(
  tree: Map<number, SWCNode>,
  ids: number[],
  newType: number,
): TreeOp[] {
  const ops: TreeOp[] = [];
  for (const id of ids) {
    const node = tree.get(id);
    if (!node || node.type === newType) continue;
    ops.push({
      type: "RETYPE",
      nodeId: id,
      before: { type: node.type },
      after: { type: newType },
    });
  }
  return ops;
}

/** Create ops to reparent a node to a new parent */
export function createReparentOps(
  tree: Map<number, SWCNode>,
  id: number,
  newParentId: number,
): TreeOp[] {
  const node = tree.get(id);
  if (!node) return [];

  // Cycle check: walk from newParentId to root, reject if id is encountered
  let current = newParentId;
  while (current !== -1) {
    if (current === id) return []; // would create cycle
    const parent = tree.get(current);
    if (!parent) break;
    current = parent.parentId;
  }

  return [
    {
      type: "REPARENT",
      nodeId: id,
      before: { parentId: node.parentId },
      after: { parentId: newParentId },
    },
  ];
}

/** Create ops to append a new child node to a parent */
export function createAppendNodeOps(
  tree: Map<number, SWCNode>,
  parentId: number,
  position: { x: number; y: number; z: number },
): TreeOp[] {
  const parent = tree.get(parentId);
  if (!parent) return [];

  let maxId = 0;
  for (const id of tree.keys()) {
    if (id > maxId) maxId = id;
  }
  const newId = maxId + 1;

  const newNode: SWCNode = {
    id: newId,
    type: parent.type,
    x: position.x,
    y: position.y,
    z: position.z,
    radius: Math.max(parent.radius, 0.5),
    parentId,
  };

  return [
    {
      type: "INSERT",
      nodeId: newId,
      before: {},
      after: { ...newNode },
      nodeSnapshot: newNode,
    },
  ];
}

/** Create ops to prune an entire subtree (no reparenting) */
export function createPruneOps(
  state: NeuronState,
  rootId: number,
): TreeOp[] {
  const ops: TreeOp[] = [];

  // BFS to collect all subtree node IDs
  const subtreeIds: number[] = [rootId];
  const queue = [rootId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const children = state.childIndex.get(current) ?? [];
    for (const childId of children) {
      subtreeIds.push(childId);
      queue.push(childId);
    }
  }

  // Sort by depth (leaves first) to avoid parent-before-child issues
  subtreeIds.sort((a, b) => getDepth(state.tree, b) - getDepth(state.tree, a));

  for (const id of subtreeIds) {
    const node = state.tree.get(id);
    if (!node) continue;
    ops.push({
      type: "DELETE",
      nodeId: id,
      before: {},
      after: {},
      nodeSnapshot: { ...node },
    });
  }

  return ops;
}

/** Get depth of a node in the tree */
function getDepth(tree: Map<number, SWCNode>, id: number): number {
  let depth = 0;
  let current = id;
  while (true) {
    const node = tree.get(current);
    if (!node || node.parentId === -1) break;
    current = node.parentId;
    depth++;
  }
  return depth;
}
