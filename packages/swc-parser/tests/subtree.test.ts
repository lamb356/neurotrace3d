import { describe, it, expect } from 'vitest';
import { parseSWC, getSubtree } from '../src/index.js';
import { buildSWCString } from './fixtures/helpers.js';

/*
 * Y-shaped tree used across tests:
 *
 *       1 (soma, root)
 *      / \
 *     2   3
 *    / \
 *   4   5
 */
const Y_TREE = buildSWCString([
  [1, 1, 0, 0, 0, 5, -1],
  [2, 3, 10, 0, 0, 1, 1],
  [3, 3, -10, 0, 0, 1, 1],
  [4, 3, 20, 10, 0, 0.5, 2],
  [5, 3, 20, -10, 0, 0.5, 2],
]);

describe('getSubtree', () => {
  it('extracts a subtree rooted at an internal node', () => {
    const result = parseSWC(Y_TREE);
    const subtree = getSubtree(result, 2);

    expect(subtree.size).toBe(3);
    expect(subtree.has(2)).toBe(true);
    expect(subtree.has(4)).toBe(true);
    expect(subtree.has(5)).toBe(true);

    // Nodes outside the subtree should not be included
    expect(subtree.has(1)).toBe(false);
    expect(subtree.has(3)).toBe(false);
  });

  it('returns the full tree when rooted at the root node', () => {
    const result = parseSWC(Y_TREE);
    const subtree = getSubtree(result, 1);

    expect(subtree.size).toBe(5);
    expect([...subtree.keys()].sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('returns an empty Map for a non-existent node ID', () => {
    const result = parseSWC(Y_TREE);
    const subtree = getSubtree(result, 999);

    expect(subtree.size).toBe(0);
    expect(subtree).toBeInstanceOf(Map);
  });

  it('returns a single-node Map for a leaf node', () => {
    const result = parseSWC(Y_TREE);
    const subtree = getSubtree(result, 5);

    expect(subtree.size).toBe(1);
    expect(subtree.has(5)).toBe(true);
    expect(subtree.get(5)!.id).toBe(5);
  });
});
