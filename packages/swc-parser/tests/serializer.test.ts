import { describe, it, expect } from 'vitest';
import { parseSWC, serializeSWC } from '../src/index.js';
import { buildSWCString } from './fixtures/helpers.js';

describe('serializeSWC', () => {
  it('round-trips a 5-node SWC with full fidelity', () => {
    const input = buildSWCString([
      [1, 1, 0, 0, 0, 5, -1],
      [2, 2, 10, 0, 0, 1, 1],
      [3, 3, 0, 10, 0, 1, 1],
      [4, 2, 20, 0, 0, 0.5, 2],
      [5, 3, 0, 20, 0, 0.5, 3],
    ]);

    const first = parseSWC(input);
    const serialized = serializeSWC(first);
    const second = parseSWC(serialized);

    expect(second.nodes.size).toBe(first.nodes.size);
    for (const [id, node] of first.nodes) {
      const roundTripped = second.nodes.get(id);
      expect(roundTripped).toBeDefined();
      expect(roundTripped!.id).toBe(node.id);
      expect(roundTripped!.type).toBe(node.type);
      expect(roundTripped!.x).toBe(node.x);
      expect(roundTripped!.y).toBe(node.y);
      expect(roundTripped!.z).toBe(node.z);
      expect(roundTripped!.radius).toBe(node.radius);
      expect(roundTripped!.parentId).toBe(node.parentId);
    }
  });

  it('preserves comments in serialized output', () => {
    const input = buildSWCString(
      [[1, 1, 0, 0, 0, 1, -1]],
      [
        '# First comment',
        '# Second comment',
        '# Third comment',
      ],
    );

    const result = parseSWC(input);
    const output = serializeSWC(result);

    expect(output).toContain('# First comment');
    expect(output).toContain('# Second comment');
    expect(output).toContain('# Third comment');
  });

  it('includes metadata in serialized output', () => {
    const input = buildSWCString(
      [[1, 1, 0, 0, 0, 1, -1]],
      ['# CREATURE mouse'],
    );

    const result = parseSWC(input);
    const output = serializeSWC(result);

    expect(output).toContain('CREATURE');
  });

  it('outputs nodes sorted by ID regardless of input order', () => {
    const input = buildSWCString([
      [3, 3, 0, 20, 0, 0.5, 1],
      [1, 1, 0, 0, 0, 5, -1],
      [2, 2, 10, 0, 0, 1, 1],
    ]);

    const result = parseSWC(input);
    const output = serializeSWC(result);

    const dataLines = output
      .split('\n')
      .filter((line) => line.length > 0 && !line.startsWith('#'));

    expect(dataLines).toHaveLength(3);
    expect(dataLines[0]).toMatch(/^1\s/);
    expect(dataLines[1]).toMatch(/^2\s/);
    expect(dataLines[2]).toMatch(/^3\s/);
  });
});
