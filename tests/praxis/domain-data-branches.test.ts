import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { listProjectsWithScenarios, listTemplatesFromHost } from 'praxis/domain-data';

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

describe('domain-data branches', () => {
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

  it('normalises host results', async () => {
    installTauriMocks({
      ipcHandler: (command, arguments_) => invokeMock(command, arguments_),
    });
    invokeMock.mockImplementationOnce(mockIpcOk([{ id: 'p1', name: 'Proj', scenarios: [] }]));
    const projects = await listProjectsWithScenarios();
    expect(projects[0]).toMatchObject({ id: 'p1', name: 'Proj' });

    invokeMock.mockImplementationOnce(
      mockIpcOk([
        {
          id: 'template-1',
          documentId: 'canvasdoc-1',
          name: 'Template',
          description: 'Example',
          widgets: [],
        },
      ]),
    );
    const templates = await listTemplatesFromHost();
    expect(templates).toHaveLength(1);
  });

  it('throws on empty or invalid host payloads', async () => {
    installTauriMocks({
      ipcHandler: (command, arguments_) => invokeMock(command, arguments_),
    });
    invokeMock.mockImplementationOnce(mockIpcOk([]));
    await expect(listProjectsWithScenarios()).rejects.toThrow('Host returned no projects');

    invokeMock.mockImplementationOnce(mockIpcOk([]));
    await expect(listTemplatesFromHost()).rejects.toThrow('Host returned no templates');

    invokeMock.mockImplementationOnce(mockIpcOk([{ id: '', name: '' }]));
    await expect(listProjectsWithScenarios()).rejects.toThrow('Missing project id');

    invokeMock.mockImplementationOnce(mockIpcOk([{ id: 'p2', name: 'Project' }]));
    await expect(listProjectsWithScenarios()).rejects.toThrow('Project scenarios missing');
  });
});
