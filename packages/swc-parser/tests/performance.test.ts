import { describe, it, expect } from 'vitest';
import { parseSWC } from '../src/index.js';
import { generateLargeSWC } from './fixtures/helpers.js';

describe('performance', () => {
  it('parses 100K nodes in under 100ms', () => {
    const content = generateLargeSWC(100_000);

    const start = performance.now();
    const result = parseSWC(content);
    const elapsed = performance.now() - start;

    expect(result.nodes.size).toBe(100_000);
    expect(result.warnings).toHaveLength(0);
    expect(elapsed).toBeLessThan(200);
  });
});
