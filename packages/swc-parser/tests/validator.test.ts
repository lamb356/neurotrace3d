import { describe, it, expect } from 'vitest';
import { parseSWC, validateSWC } from '../src/index.js';
import { buildSWCString } from './fixtures/helpers.js';

describe('validateSWC', () => {
  it('returns no warnings for a valid 5-node tree', () => {
    const input = buildSWCString([
      [1, 1, 0, 0, 0, 5, -1],
      [2, 3, 10, 0, 0, 1, 1],
      [3, 3, -10, 0, 0, 1, 1],
      [4, 3, 20, 0, 0, 0.5, 2],
      [5, 3, -20, 0, 0, 0.5, 3],
    ]);

    const result = parseSWC(input);
    const warnings = validateSWC(result);

    expect(warnings).toEqual([]);
  });

  it('detects a cycle in the child index', () => {
    // Build a simple chain: 1 -> 2 -> 3
    const input = buildSWCString([
      [1, 1, 0, 0, 0, 5, -1],
      [2, 3, 10, 0, 0, 1, 1],
      [3, 3, 20, 0, 0, 1, 2],
    ]);

    const result = parseSWC(input);

    // Manually inject a back-edge: 3 -> 1, creating cycle 1 -> 2 -> 3 -> 1
    result.childIndex.get(3)!.push(1);

    const warnings = validateSWC(result);

    expect(warnings.length).toBeGreaterThanOrEqual(1);
    expect(warnings.some((w) => w.type === 'CYCLE_DETECTED')).toBe(true);
  });

  it('detects a disconnected component', () => {
    const input = buildSWCString([
      [1, 1, 0, 0, 0, 5, -1],
      [2, 3, 10, 0, 0, 1, 1],
    ]);

    const result = parseSWC(input);

    // Add an orphan node that is not reachable from any root
    result.nodes.set(99, {
      id: 99,
      type: 3,
      x: 100,
      y: 100,
      z: 0,
      radius: 1,
      parentId: 50, // non-existent parent, but we don't add it to roots
    });

    const warnings = validateSWC(result);

    expect(warnings.length).toBeGreaterThanOrEqual(1);
    expect(warnings.some((w) => w.type === 'DISCONNECTED_COMPONENT')).toBe(true);
    expect(warnings.find((w) => w.type === 'DISCONNECTED_COMPONENT')!.nodeId).toBe(99);
  });
});
