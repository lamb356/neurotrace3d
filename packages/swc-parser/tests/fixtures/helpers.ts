/**
 * Generate a large linear SWC string with N nodes for performance testing.
 * Node 1 is soma (type 1, root), rest are axon (type 2) each 10µm apart in X.
 */
export function generateLargeSWC(count: number): string {
  const lines: string[] = ['# Generated large SWC for testing'];
  for (let i = 1; i <= count; i++) {
    const type = i === 1 ? 1 : 2;
    const x = (i - 1) * 10;
    const parentId = i === 1 ? -1 : i - 1;
    lines.push(`${i} ${type} ${x} 0 0 1 ${parentId}`);
  }
  return lines.join('\n') + '\n';
}

/**
 * Build a simple SWC string from an array of [id, type, x, y, z, radius, parentId] tuples.
 */
export function buildSWCString(
  nodes: Array<[number, number, number, number, number, number, number]>,
  comments: string[] = [],
): string {
  const lines = [...comments];
  for (const [id, type, x, y, z, r, parent] of nodes) {
    lines.push(`${id} ${type} ${x} ${y} ${z} ${r} ${parent}`);
  }
  return lines.join('\n') + '\n';
}
