import { describe, expect, it } from 'vitest';

describe('DevMemoryGraph adapter', () => {
  it('stores snapshots and computes simple diffs', async () => {
    const { DevelopmentMemoryGraph } = await import('../src/development-memory');
    const dev = new DevelopmentMemoryGraph();
    dev.put('2025-01-01', 10, 5);
    dev.put('2025-02-01', 12, 6);
    const s1 = await dev.stateAt({ asOf: '2025-01-01' });
    expect(s1.nodes).toBe(10);
    const diff = await dev.diff({ from: '2025-01-01', to: '2025-02-01' });
    expect(diff.added).toBe(2);
    expect(diff.removed).toBe(0);
  });
});
