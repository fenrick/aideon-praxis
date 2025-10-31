import { describe, expect, it, vi } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (cmd: string, args?: Record<string, unknown>) => {
    switch (cmd) {
      case 'commit_changes':
        return Promise.resolve({ id: 'c1' });
      case 'list_commits':
        return Promise.resolve({ commits: [] });
      case 'temporal_diff':
        return Promise.resolve({
          from: (args as any)?.from ?? 'from',
          to: (args as any)?.to ?? 'to',
          nodesAdded: 1,
          nodesRemoved: 0,
          edgesAdded: 2,
          edgesRemoved: 0,
        });
      default:
        return Promise.resolve({
          asOf: (args as any)?.asOf ?? 'x',
          scenario: (args as any)?.scenario ?? null,
          confidence: (args as any)?.confidence ?? null,
          nodes: 0,
          edges: 0,
        });
    }
  },
}));

describe('IpcTemporalAdapter', () => {
  it('stateAt/commit/list/create stubs roundtrip', async () => {
    const { IpcTemporalAdapter } = await import('../src/timegraph-ipc');
    const a = new IpcTemporalAdapter();
    const asOf = '2025-01-01T00:00:00.000Z';
    const s = await a.stateAt({ asOf });
    expect(s.asOf).toBe(asOf);
    expect(s.metrics.nodeCount).toBe(0);
    expect(s.metrics.edgeCount).toBe(0);
    const diff = await a.diff({
      from: '2024-12-01T00:00:00.000Z',
      to: asOf,
    });
    expect(diff.metrics.nodesAdded).toBe(1);
    expect(diff.metrics.edgesAdded).toBe(2);
    const c = await a.commit({ branch: 'main', asOf: '2025-01-01', addNodes: ['n1'] });
    expect(c.id).toBe('c1');
    const ls = await a.listCommits({ branch: 'main' });
    expect(Array.isArray(ls)).toBe(true);
    await a.createBranch({ name: 'feature/x', from: 'c1' });
  });
});
