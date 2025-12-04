import { describe, expect, it, vi } from 'vitest';

const callLog: { cmd: string; args?: Record<string, unknown> }[] = [];

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (cmd: string, arguments_?: Record<string, unknown>) => {
    callLog.push({ cmd, args: arguments_ });
    switch (cmd) {
      case 'commit_changes': {
        return Promise.resolve({ id: 'c1' });
      }
      case 'list_commits': {
        return Promise.resolve({ commits: [] });
      }
      case 'list_branches': {
        return Promise.resolve({ branches: [{ name: 'main', head: 'c1' }] });
      }
      case 'temporal_diff': {
        return Promise.resolve({
          from: (arguments_ as any)?.payload?.from ?? 'from',
          to: (arguments_ as any)?.payload?.to ?? 'to',
          node_adds: 1,
          node_mods: 0,
          node_dels: 0,
          edge_adds: 2,
          edge_mods: 0,
          edge_dels: 0,
        });
      }
      case 'topology_delta': {
        return Promise.resolve({
          from: (arguments_ as any)?.payload?.from ?? 'from',
          to: (arguments_ as any)?.payload?.to ?? 'to',
          node_adds: 2,
          node_dels: 1,
          edge_adds: 3,
          edge_dels: 1,
        });
      }
      case 'create_branch': {
        return Promise.resolve({
          name: (arguments_ as any)?.payload?.name ?? 'feature/x',
          head: 'c1',
        });
      }
      case 'merge_branches': {
        return Promise.resolve({ result: 'merge-1' });
      }
      default: {
        return Promise.resolve({
          asOf: (arguments_ as any)?.payload?.asOf ?? 'x',
          scenario: (arguments_ as any)?.payload?.scenario ?? null,
          confidence: (arguments_ as any)?.payload?.confidence ?? null,
          nodes: 0,
          edges: 0,
        });
      }
    }
  },
}));

describe('IpcTemporalAdapter', () => {
  it('stateAt/commit/list/create stubs roundtrip', async () => {
    const { IpcTemporalAdapter } = await import('adapters/timegraph-ipc');
    const a = new IpcTemporalAdapter();
    const asOf = 'c1';
    const s = await a.stateAt({ asOf });
    expect(s.asOf).toBe(asOf);
    expect(s.nodes).toBe(0);
    expect(s.edges).toBe(0);
    const diff = await a.diff({
      from: 'c0',
      to: asOf,
    });
    expect(diff.metrics.nodeAdds).toBe(1);
    expect(diff.metrics.edgeAdds).toBe(2);
    const topology = await a.topologyDelta({ from: 'c0', to: asOf });
    expect(topology.metrics.nodeAdds).toBe(2);
    expect(topology.metrics.edgeDels).toBe(1);
    const c = await a.commit({
      branch: 'main',
      message: 'seed',
      changes: { nodeCreates: ['n1'] },
    });
    expect(c.id).toBe('c1');
    const ls = await a.listCommits({ branch: 'main' });
    expect(Array.isArray(ls)).toBe(true);
    const branch = await a.createBranch({ name: 'feature/x', from: 'c1' });
    expect(branch.head).toBe('c1');
    const branches = await a.listBranches();
    expect(branches[0]?.name).toBe('main');
    const merge = await a.mergeBranches({ source: 'feature/x', target: 'main' });
    expect(merge.result).toBe('merge-1');
  });

  it('passes scope through diff IPC payload', async () => {
    callLog.length = 0;
    const { IpcTemporalAdapter } = await import('adapters/timegraph-ipc');
    const a = new IpcTemporalAdapter();
    await a.diff({ from: 'c0', to: 'c1', scope: 'capability' });
    const diffCall = callLog.find((entry) => entry.cmd === 'temporal_diff');
    expect(diffCall?.args).toEqual({ payload: { from: 'c0', to: 'c1', scope: 'capability' } });
  });
});
