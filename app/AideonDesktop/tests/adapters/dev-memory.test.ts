import { describe, expect, it } from 'vitest';

describe('DevMemoryGraph adapter', () => {
  it('stores snapshots and computes simple diffs', async () => {
    const { DevelopmentMemoryGraph } = await import('../src/development-memory');
    const dev = new DevelopmentMemoryGraph();
    const jan = '2025-01-01T00:00:00.000Z';
    const feb = '2025-02-01T00:00:00.000Z';
    dev.put(jan, 10, 5);
    dev.put(feb, 12, 6);
    const s1 = await dev.stateAt({ asOf: jan });
    expect(s1.nodes).toBe(10);
    expect(s1.edges).toBe(5);
    expect(s1.scenario).toBeUndefined();
    const diff = await dev.diff({ from: jan, to: feb });
    expect(diff.metrics.nodeAdds).toBe(2);
    expect(diff.metrics.nodeDels).toBe(0);
    expect(diff.metrics.edgeAdds).toBe(1);
    expect(diff.metrics.edgeDels).toBe(0);
  });
});
