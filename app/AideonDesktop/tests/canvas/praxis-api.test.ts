import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('/platform', () => ({
  isTauri: () => true,
}));

const invokeSpy = vi.fn<[command: string, payload: Record<string, unknown>], Promise<unknown>>();

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: Parameters<typeof invokeSpy>) => invokeSpy(...args),
}));

import {
  getStateAtSnapshot,
  getTemporalDiff,
  getWorkerHealth,
  listTemporalBranches,
  listTemporalCommits,
  mergeTemporalBranches,
} praxis-api';

const snapshot = {
  asOf: 'commit-main-002',
  scenario: 'main',
  confidence: 0.95,
  nodes: 24,
  edges: 33,
};

describe('praxisApi tauri bridge', () => {
  beforeEach(() => {
    invokeSpy.mockReset();
  });

  it('lists branches through tauri command and normalises results', async () => {
    invokeSpy.mockResolvedValue({
      branches: [
        { name: 'main', head: 'commit-main-002' },
        { name: 'chronaplay', head: null },
      ],
    });

    await expect(listTemporalBranches()).resolves.toEqual([
      { name: 'main', head: 'commit-main-002' },
      { name: 'chronaplay', head: null },
    ]);
    expect(invokeSpy).toHaveBeenCalledWith('list_branches', {});
  });

  it('returns worker health snapshot from host', async () => {
    invokeSpy.mockResolvedValue({ ok: true, timestamp_ms: 1234, message: 'ok' });

    await expect(getWorkerHealth()).resolves.toEqual({
      ok: true,
      timestamp_ms: 1234,
      message: 'ok',
    });
    expect(invokeSpy).toHaveBeenCalledWith('worker_health', {});
  });

  it('maps commit payloads to camelCase fields', async () => {
    invokeSpy.mockResolvedValue({
      commits: [
        {
          id: 'commit-main-001',
          branch: 'main',
          parents: ['commit-main-000'],
          author: 'Chrona',
          time: '2025-11-15T10:33:00.000Z',
          message: 'Baseline import',
          tags: ['baseline'],
          change_count: 6,
        },
      ],
    });

    await expect(listTemporalCommits('main')).resolves.toEqual([
      {
        id: 'commit-main-001',
        branch: 'main',
        parents: ['commit-main-000'],
        author: 'Chrona',
        time: '2025-11-15T10:33:00.000Z',
        message: 'Baseline import',
        tags: ['baseline'],
        changeCount: 6,
      },
    ]);
    expect(invokeSpy).toHaveBeenCalledWith('list_commits', { branch: 'main' });
  });

  it('serialises state_at payloads for tauri commands', async () => {
    invokeSpy.mockResolvedValue(snapshot);
    await expect(
      getStateAtSnapshot({ asOf: snapshot.asOf, scenario: snapshot.scenario! }),
    ).resolves.toEqual(snapshot);
    expect(invokeSpy).toHaveBeenCalledWith('temporal_state_at', {
      payload: {
        asOf: snapshot.asOf,
        scenario: snapshot.scenario,
        confidence: null,
      },
    });
  });

  it('computes diff summaries via tauri', async () => {
    invokeSpy.mockResolvedValue({
      from: 'commit-main-001',
      to: 'commit-main-002',
      node_adds: 3,
      node_mods: 1,
      node_dels: 0,
      edge_adds: 2,
      edge_mods: 0,
      edge_dels: 0,
    });

    await expect(
      getTemporalDiff({ from: 'commit-main-001', to: 'commit-main-002', scope: 'capability' }),
    ).resolves.toEqual({
      from: 'commit-main-001',
      to: 'commit-main-002',
      metrics: {
        nodeAdds: 3,
        nodeMods: 1,
        nodeDels: 0,
        edgeAdds: 2,
        edgeMods: 0,
        edgeDels: 0,
      },
    });
    expect(invokeSpy).toHaveBeenCalledWith('temporal_diff', {
      payload: { from: 'commit-main-001', to: 'commit-main-002', scope: 'capability' },
    });
  });

  it('defaults missing diff metrics to zero', async () => {
    invokeSpy.mockResolvedValue({ from: 'a', to: 'b' });

    await expect(getTemporalDiff({ from: 'a', to: 'b' })).resolves.toEqual({
      from: 'a',
      to: 'b',
      metrics: {
        nodeAdds: 0,
        nodeMods: 0,
        nodeDels: 0,
        edgeAdds: 0,
        edgeMods: 0,
        edgeDels: 0,
      },
    });
  });

  it('maps merge conflicts and propagates result status', async () => {
    invokeSpy.mockResolvedValue({
      result: 'conflicts',
      conflicts: [
        {
          reference: 'cap-customer-onboarding',
          kind: 'node',
          message: 'Capability diverged in main',
        },
        {
          // malformed conflict should be filtered out
          reference: null,
        },
      ],
    });

    await expect(mergeTemporalBranches({ source: 'chronaplay', target: 'main' })).resolves.toEqual({
      result: 'conflicts',
      conflicts: [
        {
          reference: 'cap-customer-onboarding',
          kind: 'node',
          message: 'Capability diverged in main',
        },
      ],
    });

    expect(invokeSpy).toHaveBeenCalledWith('merge_branches', {
      payload: { source: 'chronaplay', target: 'main', strategy: undefined },
    });
  });

  it('wraps tauri errors with command context', async () => {
    invokeSpy.mockRejectedValue(new Error('IPC disconnected'));
    await expect(listTemporalBranches()).rejects.toThrow(
      "Host command 'list_branches' failed: IPC disconnected",
    );
  });
});
