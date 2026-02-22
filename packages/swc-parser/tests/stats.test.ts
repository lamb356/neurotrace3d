import { describe, it, expect } from 'vitest';
import { parseSWC, computeStats } from '../src/index.js';
import { buildSWCString } from './fixtures/helpers.js';

describe('computeStats', () => {
  it('computes correct stats for a straight line', () => {
    // 5 nodes in a line, each 10um apart along X
    const input = buildSWCString([
      [1, 1, 0, 0, 0, 5, -1],
      [2, 2, 10, 0, 0, 1, 1],
      [3, 2, 20, 0, 0, 1, 2],
      [4, 2, 30, 0, 0, 1, 3],
      [5, 2, 40, 0, 0, 1, 4],
    ]);

    const result = parseSWC(input);
    const stats = computeStats(result);

    expect(stats.totalNodes).toBe(5);
    expect(stats.totalLength).toBeCloseTo(40, 5);
    expect(stats.branchPoints).toBe(0);
    expect(stats.terminalTips).toBe(1);
    expect(stats.maxPathDistance).toBeCloseTo(40, 5);
    expect(stats.maxBranchOrder).toBe(0);
    expect(stats.rootCount).toBe(1);
  });

  it('computes correct stats for a Y-shaped branch', () => {
    // Root -> node 2 (branch point) -> node 3, node 4
    const input = buildSWCString([
      [1, 1, 0, 0, 0, 5, -1],
      [2, 3, 10, 0, 0, 1, 1],
      [3, 3, 10, 10, 0, 0.5, 2],
      [4, 3, 10, -10, 0, 0.5, 2],
    ]);

    const result = parseSWC(input);
    const stats = computeStats(result);

    expect(stats.totalNodes).toBe(4);
    expect(stats.branchPoints).toBe(1);
    expect(stats.terminalTips).toBe(2);
    expect(stats.maxBranchOrder).toBe(1);
    expect(stats.rootCount).toBe(1);
  });

  it('handles an empty parse result', () => {
    const result = parseSWC('');
    const stats = computeStats(result);

    expect(stats.totalNodes).toBe(0);
    expect(stats.totalLength).toBe(0);
    expect(stats.branchPoints).toBe(0);
    expect(stats.terminalTips).toBe(0);
    expect(stats.maxPathDistance).toBe(0);
    expect(stats.maxBranchOrder).toBe(0);
    expect(stats.nodeCountByType.size).toBe(0);
    expect(stats.rootCount).toBe(0);
  });

  it('counts nodes correctly by type', () => {
    // 1 soma (type 1), 2 axon (type 2), 1 basal dendrite (type 3)
    const input = buildSWCString([
      [1, 1, 0, 0, 0, 5, -1],
      [2, 2, 10, 0, 0, 1, 1],
      [3, 2, 20, 0, 0, 1, 1],
      [4, 3, 0, 10, 0, 1, 1],
    ]);

    const result = parseSWC(input);
    const stats = computeStats(result);

    expect(stats.nodeCountByType.get(1)).toBe(1); // soma
    expect(stats.nodeCountByType.get(2)).toBe(2); // axon
    expect(stats.nodeCountByType.get(3)).toBe(1); // basal dendrite
    expect(stats.totalNodes).toBe(4);
  });
});
