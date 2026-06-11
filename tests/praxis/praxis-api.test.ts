import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildOkResponse, clearTauriMocks, installTauriMocks } from '../tauri-mocks';

import {
  getGraphView,
  getTemporalDiff,
  getWorkerHealth,
  listScenarios,
  listTemporalBranches,
  listTemporalCommits,
  mergeTemporalBranches,
  type TemporalMergeConflict,
  type TemporalMergeResult,
} from 'praxis/praxis-api';

const invokeMock =
  vi.fn<(command: string, arguments_: Record<string, unknown> | undefined) => unknown>();

/**
 * Create a successful IPC envelope response for the adapter boundary.
 * @param result
 */
function mockIpcOk(result: unknown) {
  invokeMock.mockImplementationOnce((_command: string, invokeArguments: unknown) =>
    Promise.resolve(buildOkResponse(invokeArguments, result)),
  );
}

describe('praxis-api normalization', () => {
  beforeEach(() => {
    invokeMock.mockReset();
    invokeMock.mockImplementation(
      (command: string, arguments_: Record<string, unknown> | undefined) =>
        buildOkResponse(arguments_),
    );
    clearTauriMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    clearTauriMocks();
  });

  it('returns worker health from host', async () => {
    installTauriMocks({
      ipcHandler: (command, arguments_) => invokeMock(command, arguments_),
    });
    mockIpcOk({ ok: true, timestamp_ms: 123, status: 'ok' });

    const snapshot = await getWorkerHealth();

    expect(snapshot.ok).toBe(true);
    expect(snapshot.timestamp_ms).toBe(123);
  });

  it('normalizes branch payloads from the host', async () => {
    installTauriMocks({
      ipcHandler: (command, arguments_) => invokeMock(command, arguments_),
    });
    mockIpcOk({
      branches: [
        { name: 'main', head: undefined },
        { name: 'dev', head: 'h1' },
      ],
    });

    const branches = await listTemporalBranches();

    expect(branches).toEqual([
      { name: 'main', head: undefined },
      { name: 'dev', head: 'h1' },
    ]);
  });

  it('normalizes commit payloads from the host', async () => {
    installTauriMocks({
      ipcHandler: (command, arguments_) => invokeMock(command, arguments_),
    });
    mockIpcOk({
      commits: [
        {
          id: 'c1',
          branch: 'main',
          message: 'Commit 1',
          parents: ['p1', 42],
          tags: ['t1', 99],
          change_count: 3,
        },
        {
          id: 'c2',
          branch: 'main',
          message: 'Commit 2',
          parents: [],
          tags: [],
          changeCount: 0,
        },
      ],
    });

    const commits = await listTemporalCommits('main');

    expect(commits[0]).toMatchObject({
      id: 'c1',
      branch: 'main',
      parents: ['p1'],
      tags: ['t1'],
      changeCount: 3,
    });
    expect(commits[1]).toMatchObject({ id: 'c2', branch: 'main', message: 'Commit 2' });
  });

  it('wraps host errors when invoking commands inside Tauri', async () => {
    installTauriMocks({
      ipcHandler: (command, arguments_) => invokeMock(command, arguments_),
    });
    invokeMock.mockRejectedValue(new Error('bad news'));

    await expect(
      getGraphView({
        id: 'g1',
        name: 'Graph',
        kind: 'graph',
        asOf: '2025-01-01',
      }),
    ).rejects.toThrow("Host command 'praxis_artefact_execute_graph' failed: bad news");
  });

  it('normalizes diff summary response', async () => {
    installTauriMocks({
      ipcHandler: (command, arguments_) => invokeMock(command, arguments_),
    });
    mockIpcOk({
      from: 'a',
      to: 'b',
      node_adds: 2,
      edge_adds: 3,
      node_mods: 1,
      node_dels: 0,
      edge_mods: 4,
      edge_dels: 5,
    });

    const summary = await getTemporalDiff({ from: 'a', to: 'b', scope: 'cap' });

    expect(summary.from).toBe('a');
    expect(summary.to).toBe('b');
    expect(summary.metrics).toMatchObject({ nodeAdds: 2, edgeAdds: 3 });
  });

  it('drops malformed merge conflicts and infers a conflicts result', async () => {
    installTauriMocks({
      ipcHandler: (command, arguments_) => invokeMock(command, arguments_),
    });
    mockIpcOk({
      conflicts: [{ reference: 'cap-1', kind: 5 }, { kind: 'node' }],
    });

    const result: TemporalMergeResult = await mergeTemporalBranches({
      source: 'chronaplay',
      target: 'main',
    });

    expect(result.result).toBe('conflicts');
    const rawConflicts: unknown[] = Array.isArray(result.conflicts) ? result.conflicts : [];
    const conflicts: TemporalMergeConflict[] = rawConflicts.filter(
      (conflict): conflict is TemporalMergeConflict =>
        typeof (conflict as { reference?: unknown }).reference === 'string' &&
        typeof (conflict as { kind?: unknown }).kind === 'string' &&
        typeof (conflict as { message?: unknown }).message === 'string',
    );
    expect(conflicts).toHaveLength(1);
    expect(conflicts).not.toHaveLength(0);
    const firstConflict = conflicts[0];
    if (!firstConflict) {
      throw new Error('Expected conflict entry.');
    }
    expect(firstConflict).toMatchObject({ reference: 'cap-1', kind: 'unknown' });
    expect(typeof firstConflict.message).toBe('string');
  });

  it('returns scenarios from host', async () => {
    installTauriMocks({
      ipcHandler: (command, arguments_) => invokeMock(command, arguments_),
    });
    mockIpcOk([{ id: 's1', name: 'Main', branch: 'main', updatedAt: 'now', isDefault: true }]);

    const scenarios = await listScenarios();

    expect(scenarios).toHaveLength(1);
    expect(scenarios[0]?.branch).toBe('main');
  });
});
