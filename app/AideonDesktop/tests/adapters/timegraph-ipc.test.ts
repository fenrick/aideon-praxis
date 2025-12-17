import { beforeEach, describe, expect, it, vi } from 'vitest';

const callLog: { cmd: string; args?: Record<string, unknown> }[] = [];
const overrides = new Map<string, unknown>();

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (cmd: string, arguments_?: Record<string, unknown>) => {
    callLog.push({ cmd, args: arguments_ });
    if (overrides.has(cmd)) {
      const value = overrides.get(cmd);
      overrides.delete(cmd);
      return Promise.resolve(value);
    }
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
          from: (arguments_?.payload as { from?: string } | undefined)?.from ?? 'from',
          to: (arguments_?.payload as { to?: string } | undefined)?.to ?? 'to',
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
          from: (arguments_?.payload as { from?: string } | undefined)?.from ?? 'from',
          to: (arguments_?.payload as { to?: string } | undefined)?.to ?? 'to',
          node_adds: 2,
          node_dels: 1,
          edge_adds: 3,
          edge_dels: 1,
        });
      }
      case 'create_branch': {
        return Promise.resolve({
          name: (arguments_?.payload as { name?: string } | undefined)?.name ?? 'feature/x',
          head: 'c1',
        });
      }
      case 'merge_branches': {
        return Promise.resolve({ result: 'merge-1' });
      }
      default: {
        return Promise.resolve({
          asOf: (arguments_?.payload as { asOf?: string } | undefined)?.asOf ?? 'x',
          scenario: (arguments_?.payload as { scenario?: string } | undefined)?.scenario,
          confidence: (arguments_?.payload as { confidence?: number } | undefined)?.confidence,
          nodes: 0,
          edges: 0,
        });
      }
    }
  },
}));

describe('IpcTemporalAdapter', () => {
  beforeEach(() => {
    callLog.length = 0;
    overrides.clear();
  });

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
    const { IpcTemporalAdapter } = await import('adapters/timegraph-ipc');
    const a = new IpcTemporalAdapter();
    await a.diff({ from: 'c0', to: 'c1', scope: 'capability' });
    const diffCall = callLog.find((entry) => entry.cmd === 'temporal_diff');
    expect(diffCall?.args).toEqual({ payload: { from: 'c0', to: 'c1', scope: 'capability' } });
  });

  it('omits optional fields when undefined and filters malformed payloads', async () => {
    const { IpcTemporalAdapter } = await import('adapters/timegraph-ipc');
    const a = new IpcTemporalAdapter();

    await a.stateAt({ asOf: 'c9', scenario: 'dev', confidence: 0.9 });
    const stateAtCall = callLog.find((entry) => entry.cmd === 'temporal_state_at');
    expect(stateAtCall?.args).toEqual({
      payload: { asOf: 'c9', scenario: 'dev', confidence: 0.9 },
    });

    await a.createBranch({ name: 'feature/no-from' });
    const createBranchCall = callLog.find((entry) => entry.cmd === 'create_branch');
    expect(createBranchCall?.args).toEqual({ payload: { name: 'feature/no-from' } });

    await a.stateAt({ asOf: 'c10' });
    const stateAtCallMinimal = callLog.filter((entry) => entry.cmd === 'temporal_state_at')[1];
    expect(stateAtCallMinimal?.args).toEqual({ payload: { asOf: 'c10' } });

    await a.diff({ from: 'c0', to: 'c1' });
    const diffCall = callLog.find((entry) => entry.cmd === 'temporal_diff');
    expect(diffCall?.args).toEqual({ payload: { from: 'c0', to: 'c1' } });

    overrides.set('list_branches', {
      branches: [{ name: 123 }, { head: 'h1' }],
    });
    const branches = await a.listBranches();
    expect(branches).toEqual([
      { name: '', head: undefined },
      { name: '', head: 'h1' },
    ]);

    overrides.set('topology_delta', {
      from: 1,
      to: undefined,
      node_adds: '2',
      node_dels: 1,
      edge_dels: 0,
    });
    const delta = await a.topologyDelta({ from: 'c0', to: 'c1' });
    expect(delta).toEqual({
      from: '',
      to: '',
      metrics: { nodeAdds: 0, nodeDels: 1, edgeAdds: 0, edgeDels: 0 },
    });

    overrides.set('topology_delta', {
      from: 'c0',
      to: 'c1',
      node_adds: 2,
      node_dels: 0,
      edge_adds: 1,
      edge_dels: 4,
    });
    const deltaOk = await a.topologyDelta({ from: 'c0', to: 'c1' });
    expect(deltaOk.metrics).toEqual({ nodeAdds: 2, nodeDels: 0, edgeAdds: 1, edgeDels: 4 });
  });

  it('normalises merge conflicts and tolerates missing fields', async () => {
    const { IpcTemporalAdapter } = await import('adapters/timegraph-ipc');
    const a = new IpcTemporalAdapter();

    overrides.set('merge_branches', {
      result: 123,
      conflicts: [
        { reference: 'r1', kind: 'node', message: 'conflict' },
        { reference: '', kind: 'edge' },
        { kind: 'node' },
      ],
    });

    const result = await a.mergeBranches({ source: 'a', target: 'b' });
    expect(result.result).toBeUndefined();
    expect(result.conflicts).toEqual([{ reference: 'r1', kind: 'node', message: 'conflict' }]);
  });

  it('serializes commit payloads and supports meta-model fetch', async () => {
    const { IpcTemporalAdapter } = await import('adapters/timegraph-ipc');
    const a = new IpcTemporalAdapter();

    await a.commit({
      branch: 'dev',
      parent: 'p0',
      author: 'Alice',
      message: 'Full changes',
      tags: ['t1'],
      time: '2025-01-01T00:00:00Z',
      changes: {
        nodeCreates: [],
        nodeDeletes: ['n1'],
        edgeCreates: [{ from: 'n1', to: 'n2' }],
        edgeDeletes: [{ from: 'n2', to: 'n3' }],
      },
    });

    const commitCall = callLog.find((entry) => entry.cmd === 'commit_changes');
    expect(commitCall?.args).toEqual({
      payload: {
        branch: 'dev',
        parent: 'p0',
        author: 'Alice',
        message: 'Full changes',
        tags: ['t1'],
        time: '2025-01-01T00:00:00Z',
        changes: {
          nodeDeletes: [{ id: 'n1' }],
          edgeCreates: [{ from: 'n1', to: 'n2' }],
          edgeDeletes: [{ from: 'n2', to: 'n3' }],
        },
      },
    });

    overrides.set('temporal_metamodel_get', { version: 'v1' });
    const meta = await a.getMetaModel();
    expect(meta).toEqual({ version: 'v1' });
  });
});
