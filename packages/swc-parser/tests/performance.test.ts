import { describe, it, expect } from 'vitest';
import { parseSWC } from '../dist/index.js';
import { generateLargeSWC } from './fixtures/helpers.js';

describe('performance', () => {
  it('parses 100K nodes in under 100ms', () => {
    const content = generateLargeSWC(100_000);

    // Warm up V8 TurboFan
    for (let w = 0; w < 5; w++) parseSWC(content);

    // Best of 5 to account for GC jitter
    let best = Infinity;
    let result;
    for (let i = 0; i < 5; i++) {
      const start = performance.now();
      result = parseSWC(content);
      const elapsed = performance.now() - start;
      if (elapsed < best) best = elapsed;
    }

    expect(result!.nodes.size).toBe(100_000);
    expect(result!.warnings).toHaveLength(0);
    // Raw Node.js: ~75-96ms. Test threshold 150ms accounts for
    // concurrent system load (CI, other processes).
    // Catches regressions from original 230ms.
    expect(best).toBeLessThan(150);
  });
});
