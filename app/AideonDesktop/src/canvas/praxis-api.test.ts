import { describe, expect, it, vi } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import * as platform from './platform';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));

const invokeMock = vi.mocked(invoke);

describe('praxis-api callOrMock flows', () => {
  it('falls back to mock when not in tauri for temporal diff', async () => {
    vi.spyOn(platform, 'isTauri').mockReturnValue(false);
    const { getTemporalDiff } = await import('./praxis-api');

    const diff = await getTemporalDiff({ from: 'a', to: 'b' });
    expect(diff.metrics.nodeAdds).toBeGreaterThanOrEqual(0);
  });

  it('wraps invoke errors with readable message', async () => {
    vi.spyOn(platform, 'isTauri').mockReturnValue(true);
    const { getTemporalDiff } = await import('./praxis-api');
    invokeMock.mockRejectedValueOnce(new Error('boom'));

    await expect(getTemporalDiff({ from: 'a', to: 'b' })).rejects.toThrow(
      /Host command 'temporal_diff' failed: boom/,
    );
  });

  it('normalises branches when host returns loose payloads', async () => {
    vi.spyOn(platform, 'isTauri').mockReturnValue(true);
    const { listTemporalBranches } = await import('./praxis-api');
    invokeMock.mockResolvedValueOnce({ branches: [{ name: 'main', head: 1 }, { name: 7 }] });

    const branches = await listTemporalBranches();
    expect(branches).toEqual([
      { name: 'main', head: undefined },
      { name: '', head: undefined },
    ]);
  });

  it('maps commit payload fields safely', async () => {
    vi.spyOn(platform, 'isTauri').mockReturnValue(true);
    const { listTemporalCommits } = await import('./praxis-api');
    invokeMock.mockResolvedValueOnce({
      commits: [
        { id: 'c1', parents: ['p1'], branch: 'dev', message: 'Commit', change_count: 2 },
      ],
    });

    const commits = await listTemporalCommits('dev');
    expect(commits[0]).toMatchObject({ id: 'c1', branch: 'dev', changeCount: 2 });
  });

  it('returns mock commit id when applying operations outside tauri', async () => {
    vi.spyOn(platform, 'isTauri').mockReturnValue(false);
    const { applyOperations } = await import('./praxis-api');

    const result = await applyOperations([{ kind: 'createNode', node: { id: 'n1' } }]);
    expect(result.commitId).toBeTruthy();
  });
});
