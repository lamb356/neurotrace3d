import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseSWC } from '../src/index.js';
import { buildSWCString } from './fixtures/helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('parseSWC', () => {
  it('parses minimal valid SWC with 3 nodes', () => {
    const input = buildSWCString([
      [1, 1, 0, 0, 0, 1, -1],
      [2, 2, 10, 0, 0, 0.5, 1],
      [3, 3, 0, 10, 0, 0.5, 1],
    ]);

    const result = parseSWC(input);

    expect(result.nodes.size).toBe(3);
    expect(result.roots).toEqual([1]);
    expect(result.childIndex.get(1)).toEqual([2, 3]);
    expect(result.warnings).toHaveLength(0);
  });

  it('handles empty input without crashing', () => {
    const result = parseSWC('');

    expect(result.nodes.size).toBe(0);
    expect(result.roots).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('handles comment-only file without crashing', () => {
    const input = '# This is a comment\n# Another comment\n';

    const result = parseSWC(input);

    expect(result.nodes.size).toBe(0);
    expect(result.comments).toContain('# This is a comment');
    expect(result.comments).toContain('# Another comment');
    expect(result.warnings).toEqual([]);
  });

  it('extracts metadata from header comments', () => {
    const input = buildSWCString(
      [[1, 1, 0, 0, 0, 1, -1]],
      [
        '# ORIGINAL_SOURCE foo',
        '# CREATURE rat',
        '# REGION cortex',
        '# CELL_TYPE pyramidal',
      ],
    );

    const result = parseSWC(input);

    expect(result.metadata.originalSource).toBe('foo');
    expect(result.metadata.species).toBe('rat');
    expect(result.metadata.brainRegion).toBe('cortex');
    expect(result.metadata.cellType).toBe('pyramidal');
  });

  it('parses realistic pyramidal neuron fixture', () => {
    const fixturePath = join(__dirname, 'fixtures', 'sample-pyramidal.swc');
    const content = readFileSync(fixturePath, 'utf-8');

    const result = parseSWC(content);

    expect(result.nodes.size).toBe(200);
    expect(result.roots).toHaveLength(1);
    expect(result.warnings).toHaveLength(0);
  });
});
