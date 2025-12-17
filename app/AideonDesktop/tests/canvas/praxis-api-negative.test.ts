import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
});

describe('praxis-api negative paths', () => {
  it('wraps host errors when Tauri invoke fails', async () => {
    const invokeMock = vi.fn().mockRejectedValue(new Error('boom'));
    vi.doMock('canvas/platform', () => ({ isTauri: () => true }));
    vi.doMock('@tauri-apps/api/core', () => ({ invoke: invokeMock }));
    const { getGraphView } = await import('canvas/praxis-api');

    await expect(
      getGraphView({ id: 'g1', name: 'Graph', kind: 'graph', asOf: 'now' }),
    ).rejects.toThrow("Host command 'praxis_graph_view' failed: boom");
  });

  it('normalises host branch/commit payloads from invoke responses', async () => {
    const invokeMock = vi
      .fn()
      // listBranches
      .mockResolvedValueOnce({ branches: [{ name: 'main' }, { head: 'abc' }] })
      // listCommits
      .mockResolvedValueOnce({
        commits: [
          {
            id: undefined,
            parents: ['p1'],
            tags: ['tag', 1],
            message: undefined,
            change_count: 'x',
          },
        ],
      });
    vi.doMock('canvas/platform', () => ({ isTauri: () => true }));
    vi.doMock('@tauri-apps/api/core', () => ({ invoke: invokeMock }));

    const { listTemporalBranches, listTemporalCommits } = await import('canvas/praxis-api');
    const branches = await listTemporalBranches();
    expect(branches).toEqual([
      { name: 'main', head: undefined },
      { name: '', head: 'abc' },
    ]);

    const commits = await listTemporalCommits('feat');
    expect(commits[0]).toMatchObject({
      id: 'unknown',
      branch: 'feat',
      message: 'Commit',
      tags: ['tag'],
      changeCount: 0,
    });
  });
});
