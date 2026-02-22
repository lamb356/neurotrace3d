import { describe, it, expect } from 'vitest';
import { parseSWC } from '../src/index.js';
import { buildSWCString } from './fixtures/helpers.js';

describe('edge cases', () => {
  it('warns on malformed line with wrong column count', () => {
    // 5 columns instead of 7
    const input = '1 1 0 0 0\n';

    const result = parseSWC(input);

    const warning = result.warnings.find((w) => w.type === 'MALFORMED_LINE');
    expect(warning).toBeDefined();
    expect(warning!.message).toContain('Malformed');
    expect(result.nodes.size).toBe(0);
  });

  it('warns on malformed line with non-numeric value', () => {
    const input = '1 1 abc 0 0 1 -1\n';

    const result = parseSWC(input);

    const warning = result.warnings.find((w) => w.type === 'MALFORMED_LINE');
    expect(warning).toBeDefined();
    expect(warning!.message).toContain('Malformed');
    expect(result.nodes.size).toBe(0);
  });

  it('warns on duplicate ID and keeps only the first occurrence', () => {
    const input = [
      '1 1 0 0 0 1 -1',
      '1 2 10 0 0 0.5 -1',
    ].join('\n') + '\n';

    const result = parseSWC(input);

    const warning = result.warnings.find((w) => w.type === 'DUPLICATE_ID');
    expect(warning).toBeDefined();
    expect(result.nodes.size).toBe(1);
    expect(result.nodes.get(1)!.type).toBe(1); // first one kept
  });

  it('warns on unknown type code but keeps the node', () => {
    const input = buildSWCString([
      [1, 9, 0, 0, 0, 1, -1],
    ]);

    const result = parseSWC(input);

    const warning = result.warnings.find((w) => w.type === 'UNKNOWN_TYPE');
    expect(warning).toBeDefined();
    expect(result.nodes.size).toBe(1);
    expect(result.nodes.get(1)!.type).toBe(9);
  });

  it('warns on invalid parent and makes the node a root', () => {
    const input = buildSWCString([
      [1, 1, 0, 0, 0, 1, -1],
      [2, 2, 10, 0, 0, 0.5, 99],
    ]);

    const result = parseSWC(input);

    const warning = result.warnings.find((w) => w.type === 'INVALID_PARENT');
    expect(warning).toBeDefined();
    expect(warning!.message).toContain('99');
    expect(result.nodes.get(2)!.parentId).toBe(-1);
    expect(result.roots).toContain(2);
  });

  it('warns NO_ROOT when no node has parentId=-1', () => {
    // Node 1 parent=2, node 2 parent=1: circular, neither is root
    const input = [
      '1 1 0 0 0 1 2',
      '2 2 10 0 0 0.5 1',
    ].join('\n') + '\n';

    const result = parseSWC(input);

    const noRootWarning = result.warnings.find((w) => w.type === 'NO_ROOT');
    expect(noRootWarning).toBeDefined();
    // Lowest id (1) becomes the root
    expect(result.roots).toContain(1);
  });

  it('warns on non-sequential IDs', () => {
    const input = buildSWCString([
      [1, 1, 0, 0, 0, 1, -1],
      [3, 2, 10, 0, 0, 0.5, 1],
      [5, 3, 0, 10, 0, 0.5, 1],
    ]);

    const result = parseSWC(input);

    const warning = result.warnings.find((w) => w.type === 'NON_SEQUENTIAL_IDS');
    expect(warning).toBeDefined();
  });

  it('warns when no soma (type 1) node is present', () => {
    const input = buildSWCString([
      [1, 2, 0, 0, 0, 1, -1],
      [2, 2, 10, 0, 0, 0.5, 1],
    ]);

    const result = parseSWC(input);

    const warning = result.warnings.find((w) => w.type === 'MISSING_SOMA');
    expect(warning).toBeDefined();
  });

  it('warns on negative radius', () => {
    const input = buildSWCString([
      [1, 1, 0, 0, 0, -1, -1],
    ]);

    const result = parseSWC(input);

    const warning = result.warnings.find((w) => w.type === 'RADIUS_OUTLIER');
    expect(warning).toBeDefined();
    expect(warning!.message).toContain('-1');
  });

  it('warns on excessively large radius', () => {
    const input = buildSWCString([
      [1, 1, 0, 0, 0, 150, -1],
    ]);

    const result = parseSWC(input);

    const warning = result.warnings.find((w) => w.type === 'RADIUS_OUTLIER');
    expect(warning).toBeDefined();
    expect(warning!.message).toContain('150');
  });

  it('handles Windows line endings identically to Unix', () => {
    const unixInput = buildSWCString([
      [1, 1, 0, 0, 0, 1, -1],
      [2, 2, 10, 0, 0, 0.5, 1],
      [3, 3, 0, 10, 0, 0.5, 1],
    ]);
    const windowsInput = unixInput.replace(/\n/g, '\r\n');

    const unixResult = parseSWC(unixInput);
    const windowsResult = parseSWC(windowsInput);

    expect(windowsResult.nodes.size).toBe(unixResult.nodes.size);
    expect(windowsResult.roots).toEqual(unixResult.roots);
    expect(windowsResult.warnings.length).toBe(unixResult.warnings.length);

    for (const [id, node] of unixResult.nodes) {
      const winNode = windowsResult.nodes.get(id);
      expect(winNode).toBeDefined();
      expect(winNode!.id).toBe(node.id);
      expect(winNode!.type).toBe(node.type);
      expect(winNode!.x).toBe(node.x);
      expect(winNode!.y).toBe(node.y);
      expect(winNode!.z).toBe(node.z);
      expect(winNode!.radius).toBe(node.radius);
      expect(winNode!.parentId).toBe(node.parentId);
    }
  });
});
