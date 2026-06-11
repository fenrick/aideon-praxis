import {
  getChartView,
  getGraphLayout,
  listTemporalCommits,
  mergeTemporalBranches,
  type ChartViewModel,
} from 'praxis/praxis-api';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildOkResponse, clearTauriMocks, installTauriMocks } from '../tauri-mocks';

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

const invokeMock =
  vi.fn<(command: string, arguments_: Record<string, unknown> | undefined) => unknown>();

const baseMeta = {
  id: 'chart1',
  name: 'Chart',
  asOf: '2025-01-01T00:00:00Z',
  fetchedAt: '2025-01-01T00:00:00Z',
  source: 'host' as const,
};

describe('praxis-api host paths', () => {
  beforeEach(() => {
    invokeMock.mockReset();
    invokeMock.mockImplementation(
      (command: string, arguments_: Record<string, unknown> | undefined) =>
        buildOkResponse(arguments_),
    );
    installTauriMocks({
      ipcHandler: (command, arguments_) => invokeMock(command, arguments_),
    });
  });

  afterEach(() => {
    clearTauriMocks();
  });

  it('merges branches and surfaces conflicts', async () => {
    invokeMock.mockImplementationOnce(
      mockIpcOk({ conflicts: [{ reference: 'r1', kind: 'diverge', message: 'conflict' }] }),
    );

    const result = await mergeTemporalBranches({ source: 'a', target: 'b' });

    expect(result.conflicts?.[0]).toMatchObject({
      reference: 'r1',
      kind: 'diverge',
      message: 'conflict',
    });
  });

  it('rejects commit payloads missing required fields', async () => {
    invokeMock.mockImplementationOnce(
      mockIpcOk({ commits: [{ id: 'c1', parents: [], message: 'msg', change_count: 1 }] }),
    );

    await expect(listTemporalCommits('dev')).rejects.toThrow(
      'Host commit payload missing commit.branch.',
    );
  });

  it('invokes host for chart view when in tauri', async () => {
    const chartView: ChartViewModel = {
      metadata: baseMeta,
      chartType: 'kpi',
      series: [],
    };
    invokeMock.mockImplementationOnce(mockIpcOk(chartView));

    const definition = {
      id: 'chart1',
      name: 'Chart',
      kind: 'chart',
      asOf: '2025-01-01T00:00:00Z',
      chartType: 'kpi',
      measure: 'm',
    } as const;

    await expect(getChartView(definition)).resolves.toMatchObject({
      chartType: 'kpi',
    });
    const calls = (invokeMock as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    const invokeArguments = findInvokeArguments(calls, 'praxis_artefact_execute_chart');
    expect(payloadFromInvokeArguments(invokeArguments)).toEqual(definition);
  });

  it('requests graph layout snapshots via the host', async () => {
    invokeMock.mockImplementationOnce(
      mockIpcOk({
        docId: 'doc-1',
        widgetId: 'widget-9',
        asOf: '2025-01-01',
        nodes: [{ id: 'n1', x: 1, y: 2 }],
      }),
    );

    const layout = await getGraphLayout({
      docId: 'doc-1',
      widgetId: 'widget-9',
      asOf: '2025-01-01',
    });

    expect(layout?.nodes).toEqual([{ id: 'n1', x: 1, y: 2 }]);
    const calls = (invokeMock as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    const invokeArguments = findInvokeArguments(calls, 'praxis_graph_layout_get');
    expect(payloadFromInvokeArguments(invokeArguments)).toEqual({
      docId: 'doc-1',
      widgetId: 'widget-9',
      asOf: '2025-01-01',
      scenario: undefined,
      layer: undefined,
    });
  });
});
