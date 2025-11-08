import { describe, expect, it, vi } from 'vitest';

import { createTemporalPort } from '$lib/ports/temporal';

const snapshot = {
  asOf: 'c1',
  scenario: 'main',
  confidence: null,
  nodes: 5,
  edges: 4,
};

const commits = [
  {
    id: 'c1',
    branch: 'main',
    parents: [],
    message: 'seed',
    tags: [],
    change_count: 2,
  },
];

const branches = [{ name: 'main', head: 'c1' }];

describe('temporal port', () => {
  it('delegates to the Tauri invoke API', async () => {
    const invokeMock = vi.fn(async (command: string, args?: Record<string, unknown>) => {
      switch (command) {
        case 'temporal_state_at':
          expect(args).toMatchObject({ payload: { asOf: 'c1' } });
          return snapshot;
        case 'list_commits':
          expect(args).toMatchObject({ branch: 'main' });
          return { commits };
        case 'list_branches':
          return { branches };
        case 'temporal_diff':
          expect(args).toMatchObject({ payload: { from: 'c1', to: 'c2' } });
          return {
            from: 'c1',
            to: 'c2',
            node_adds: 1,
            node_mods: 0,
            node_dels: 0,
            edge_adds: 0,
            edge_mods: 0,
            edge_dels: 0,
          };
        case 'topology_delta':
          expect(args).toMatchObject({ payload: { from: 'c1', to: 'c3' } });
          return {
            from: 'c1',
            to: 'c3',
            node_adds: 2,
            node_dels: 1,
            edge_adds: 1,
            edge_dels: 1,
          };
        case 'commit_changes':
          expect(args).toMatchObject({
            payload: {
              branch: 'main',
              message: 'commit',
              changes: {
                nodeCreates: [{ id: 'n1' }],
                edgeCreates: [{ from: 'n1', to: 'n2' }],
              },
            },
          });
          return { id: 'c2' };
        case 'create_branch':
          expect(args).toMatchObject({ payload: { name: 'feature/x', from: null } });
          return { name: 'feature/x', head: 'c1' };
        case 'merge_branches':
          expect(args).toMatchObject({ payload: { source: 'feature/x', target: 'main' } });
          return { result: 'merge-1' };
        default:
          throw new Error(`unexpected command ${command}`);
      }
    });

    const port = createTemporalPort(invokeMock as never);

    const state = await port.stateAt({ asOf: 'c1' });
    const list = await port.listCommits('main');
    expect(list[0]?.id).toBe('c1');
    const branchList = await port.listBranches();
    expect(branchList[0]?.name).toBe('main');
    expect(state.nodes).toBeGreaterThan(0);
    expect(state.edges).toBeGreaterThan(0);
    await port.diff({ from: 'c1', to: 'c2' });
    const topology = await port.topologyDelta({ from: 'c1', to: 'c3' });
    const commit = await port.commit({
      branch: 'main',
      message: 'commit',
      changes: {
        nodeCreates: [{ id: 'n1' }],
        edgeCreates: [{ from: 'n1', to: 'n2' }],
      },
    });
    const branch = await port.createBranch({ name: 'feature/x' });
    const merge = await port.merge({ source: 'feature/x', target: 'main' });

    expect(commit.id).toBe('c2');
    expect(branch).toEqual({ name: 'feature/x', head: 'c1' });
    expect(merge.result).toBe('merge-1');
    expect(topology.metrics.nodeAdds).toBe(2);
    expect(topology.metrics.edgeDels).toBe(1);
    expect(invokeMock).toHaveBeenCalledWith('create_branch', {
      payload: {
        name: 'feature/x',
        from: null,
      },
    });
  });
});
