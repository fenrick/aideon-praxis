import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clearTauriMocks, installTauriMocks } from '../tauri-mocks';

beforeEach(() => {
  vi.resetModules();
});

/**
 * Narrow unknown values to plain object records.
 * @param value
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Create a successful IPC envelope response for the adapter boundary.
 * @param result
 */
function mockIpcOk(result: unknown) {
  return (_command: string, invokeArguments: unknown) => {
    const request = isRecord(invokeArguments) ? invokeArguments.request : undefined;
    const requestId =
      isRecord(request) && typeof request.requestId === 'string' ? request.requestId : 'req';
    return Promise.resolve({ requestId, status: 'ok', result });
  };
}

describe('praxis-api negative paths', () => {
  afterEach(() => {
    clearTauriMocks();
  });

  it('wraps host errors when Tauri invoke fails', async () => {
    const invokeMock = vi
      .fn<(command: string, arguments_: Record<string, unknown> | undefined) => unknown>()
      .mockRejectedValue(new Error('boom'));
    installTauriMocks({
      ipcHandler: (command, arguments_) => invokeMock(command, arguments_),
    });
    const { getGraphView } = await import('praxis/praxis-api');

    await expect(
      getGraphView({ id: 'g1', name: 'Graph', kind: 'graph', asOf: 'now' }),
    ).rejects.toThrow("Host command 'praxis_artefact_execute_graph' failed: boom");
  });

  it('rejects commit payloads missing required fields', async () => {
    const invokeMock = vi
      .fn<(command: string, arguments_: Record<string, unknown> | undefined) => unknown>()
      // listBranches
      .mockImplementationOnce(mockIpcOk({ branches: [{ name: 'main' }, { head: 'abc' }] }))
      // listCommits
      .mockImplementationOnce(
        mockIpcOk({
          commits: [
            {
              id: undefined,
              parents: ['p1'],
              tags: ['tag', 1],
              message: undefined,
              change_count: 'x',
            },
          ],
        }),
      );
    installTauriMocks({
      ipcHandler: (command, arguments_) => invokeMock(command, arguments_),
    });

    const { listTemporalBranches, listTemporalCommits } = await import('praxis/praxis-api');
    await expect(listTemporalBranches()).rejects.toThrow(
      'Host commit payload missing branch.name.',
    );

    await expect(listTemporalCommits('feat')).rejects.toThrow(
      'Host commit payload missing commit.id.',
    );
  });
});
