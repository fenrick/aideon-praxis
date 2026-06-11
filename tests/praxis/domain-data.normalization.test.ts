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

describe('domain-data normalization', () => {
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

  it('normalises host payloads and trims names', async () => {
    invokeMock.mockImplementationOnce(
      mockIpcOk([{ id: 'p1', name: '  Project X  ', scenarios: [] }] as unknown),
    );

    const projects = await listProjectsWithScenarios();
    expect(projects).toHaveLength(1);
    expect(projects[0]?.id).toBe('p1');
    expect(projects[0]?.name).toBe('Project X');

    invokeMock.mockImplementationOnce(
      mockIpcOk([
        {
          id: 'template-1',
          documentId: 'canvasdoc-1',
          name: '  Template  ',
          description: 'Example',
          widgets: [],
        },
      ]),
    );

    const templates = await listTemplatesFromHost();
    expect(templates).toHaveLength(1);
    expect(templates[0]?.name).toBe('Template');
  });

  it('rejects invalid payload shapes', async () => {
    invokeMock.mockImplementationOnce(mockIpcOk({ unexpected: true }));
    await expect(listProjectsWithScenarios()).rejects.toThrow('Host returned no projects');

    invokeMock.mockImplementationOnce(mockIpcOk([{ id: '', name: '' }] as unknown));
    await expect(listProjectsWithScenarios()).rejects.toThrow('Missing project id');

    invokeMock.mockImplementationOnce(
      mockIpcOk([{ id: 't1', documentId: 'd1', name: 'Template' }] as unknown),
    );
    await expect(listTemplatesFromHost()).rejects.toThrow('Template widgets missing');
  });
});
