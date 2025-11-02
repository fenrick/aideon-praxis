import { describe, expect, it, vi } from 'vitest';

import { createTemporalPort } from '$lib/ports/temporal';

const snapshot = {
  asOf: '2025-01-01',
  scenario: null,
  confidence: null,
  nodes: 1,
  edges: 0,
};

const commits = [{ id: 'c1', branch: 'main', as_of: '2025-01-01' }];

describe('temporal port', () => {
  it('delegates to the Tauri invoke API', async () => {
    const invokeMock = vi.fn(async (command: string, args?: Record<string, unknown>) => {
      switch (command) {
        case 'temporal_state_at':
          expect(args).toMatchObject({ as_of: '2025-01-01' });
          return snapshot;
        case 'list_commits':
          expect(args).toMatchObject({ branch: 'main' });
          return { commits };
        case 'temporal_diff':
          expect(args).toMatchObject({ from: 'c1', to: 'c2' });
          return {
            from: 'c1',
            to: 'c2',
            metrics: { nodesAdded: 1, nodesRemoved: 0, edgesAdded: 0, edgesRemoved: 0 },
          };
        case 'commit_changes':
          expect(args).toMatchObject({
            branch: 'main',
            as_of: '2025-02-01',
            changes: {
              add_nodes: [{ id: 'n1' }],
              remove_nodes: [],
              add_edges: [{ source: 'n1', target: 'n2' }],
              remove_edges: [],
            },
          });
          return { id: 'c2' };
        case 'create_branch':
          expect(args).toMatchObject({ name: 'feature/x' });
          return { name: 'feature/x', head: 'c1' };
        default:
          throw new Error(`unexpected command ${command}`);
      }
    });

    const port = createTemporalPort(invokeMock as never);

    await port.stateAt({ asOf: '2025-01-01' });
    const list = await port.listCommits('main');
    expect(list[0]?.asOf).toBe('2025-01-01T00:00:00.000Z');
    await port.diff({ from: 'c1', to: 'c2' });
    const commit = await port.commit({
      branch: 'main',
      asOf: '2025-02-01',
      addNodes: ['n1'],
      addEdges: [{ source: 'n1', target: 'n2' }],
    });
    const branch = await port.createBranch({ name: 'feature/x' });

    expect(commit.id).toBe('c2');
    expect(branch).toEqual({ name: 'feature/x', head: 'c1' });
    expect(invokeMock).toHaveBeenCalledWith('create_branch', {
      name: 'feature/x',
      from: null,
    });
  });
});
