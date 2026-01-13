import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  applyOperations,
  getCatalogueView,
  getChartView,
  getGraphView,
  getMatrixView,
  getStateAtSnapshot,
  listTemporalCommits,
  mergeTemporalBranches,
} from 'praxis/praxis-api';

import { buildOkResponse, clearTauriMocks, installTauriMocks } from '../tauri-mocks';

const invokeMock =
  vi.fn<(command: string, arguments_: Record<string, unknown> | undefined) => unknown>();

/**
 * Narrow unknown values to plain object records.
 * @param value
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Extract payload from invoke arguments.
 * @param invokeArguments
 */
function payloadFromInvokeArguments(invokeArguments: unknown): unknown {
  if (!isRecord(invokeArguments)) {
    return undefined;
  }
  const request = invokeArguments.request;
  if (!isRecord(request)) {
    return undefined;
  }
  return request.payload;
}

/**
 * Find invoke args for a given command.
 * @param calls
 * @param command
 */
function findInvokeArguments(calls: unknown[][], command: string): unknown {
  const call = calls.find((entry) => entry[0] === command);
  return call?.[1];
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

describe('praxis-api host commands', () => {
  beforeEach(() => {
    invokeMock.mockReset();
    invokeMock.mockImplementation(
      (command: string, arguments_: Record<string, unknown> | undefined) =>
        buildOkResponse(arguments_),
    );
  });

  afterEach(() => {
    clearTauriMocks();
  });

  it('invokes host for temporal and artefact commands', async () => {
    installTauriMocks({
      ipcHandler: (command, arguments_) => invokeMock(command, arguments_),
    });

    invokeMock.mockImplementationOnce(
      mockIpcOk({
        columns: [],
        rows: [],
        metadata: { id: 'cat', name: 'Catalogue', asOf: 'c1', fetchedAt: 'now', source: 'host' },
      }),
    );
    await getCatalogueView({
      id: 'cat',
      name: 'Catalogue',
      kind: 'catalogue',
      asOf: 'c1',
      columns: [],
    });

    invokeMock.mockImplementationOnce(
      mockIpcOk({
        rows: [],
        columns: [],
        cells: [],
        metadata: { id: 'm1', name: 'Matrix', asOf: 'c1', fetchedAt: 'now', source: 'host' },
      }),
    );
    await getMatrixView({
      id: 'm1',
      name: 'Matrix',
      kind: 'matrix',
      asOf: 'c1',
      rowType: 'Capability',
      columnType: 'Service',
      relationship: 'depends_on',
    });

    invokeMock.mockImplementationOnce(
      mockIpcOk({
        chartType: 'kpi',
        series: [],
        kpi: { value: 1 },
        metadata: { id: 'c1', name: 'KPI', asOf: 'c1', fetchedAt: 'now', source: 'host' },
      }),
    );
    await getChartView({
      id: 'c1',
      name: 'KPI',
      kind: 'chart',
      asOf: 'c1',
      chartType: 'kpi',
      measure: 'count',
    });

    invokeMock.mockImplementationOnce(
      mockIpcOk({
        commits: [
          {
            id: 'commit-1',
            branch: 'main',
            message: 'Init',
            tags: [],
            parents: [],
            changeCount: 0,
          },
        ],
      }),
    );
    await listTemporalCommits('main');

    invokeMock.mockImplementationOnce(mockIpcOk({ result: 'merged', conflicts: [] }));
    await mergeTemporalBranches({ source: 'branch-a', target: 'main' });

    invokeMock.mockImplementationOnce(mockIpcOk({ accepted: true, commitId: 'c1' }));
    await applyOperations([{ kind: 'deleteNode', nodeId: 'n1' }]);

    invokeMock.mockImplementationOnce(
      mockIpcOk({ asOf: 'c1', scenario: 'main', nodes: 1, edges: 0 }),
    );
    await getStateAtSnapshot({ asOf: 'c1', scenario: 'main' });

    expect(invokeMock).toHaveBeenCalled();
  });

  it('invokes host on success when in Tauri', async () => {
    installTauriMocks({
      ipcHandler: (command, arguments_) => invokeMock(command, arguments_),
    });
    const graphView = {
      metadata: {
        id: 'g1',
        name: 'Graph',
        asOf: '2025-01-01',
        fetchedAt: '2025-01-01',
        source: 'host' as const,
      },
      stats: { nodes: 1, edges: 0 },
      nodes: [{ id: 'n1', label: 'Node 1' }],
      edges: [],
    };
    invokeMock.mockImplementationOnce(mockIpcOk(graphView));

    await expect(
      getGraphView({ id: 'g1', name: 'Graph', kind: 'graph', asOf: '2025-01-01' }),
    ).resolves.toMatchObject({ stats: { nodes: 1 } });
    const calls = (invokeMock as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    const invokeArguments = findInvokeArguments(calls, 'praxis_artefact_execute_graph');
    expect(payloadFromInvokeArguments(invokeArguments)).toEqual({
      id: 'g1',
      name: 'Graph',
      kind: 'graph',
      asOf: '2025-01-01',
    });
  });
});
