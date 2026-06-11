import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  listProjectsWithScenarios,
  listTemplatesFromHost,
  saveTemplateToHost,
} from 'praxis/domain-data';

import { buildOkResponse, clearTauriMocks, installTauriMocks } from '../tauri-mocks';

const invokeMock =
  vi.fn<(command: string, arguments_: Record<string, unknown> | undefined) => unknown>();

/**
 * Create a successful IPC envelope response for the adapter boundary.
 * @param result
 */
function mockIpcOk(result: unknown) {
  return (_command: string, invokeArguments: unknown) =>
    Promise.resolve(buildOkResponse(invokeArguments, result));
}

describe('domain-data adapters', () => {
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

  it('loads projects from the host', async () => {
    invokeMock.mockImplementationOnce(mockIpcOk([{ id: 'p1', name: 'Project', scenarios: [] }]));
    const projects = await listProjectsWithScenarios();
    expect(projects).toHaveLength(1);
    expect(projects[0]?.id).toBe('p1');
  });

  it('loads templates from the host', async () => {
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
    expect(templates[0]?.id).toBe('template-1');
  });

  it('saves templates through the host', async () => {
    invokeMock.mockImplementationOnce(
      mockIpcOk({
        id: 'template-1',
        documentId: 'canvasdoc-1',
        name: 'Template',
        description: 'Example',
        widgets: [],
      }),
    );
    const saved = await saveTemplateToHost({
      id: 'template-1',
      documentId: 'canvasdoc-1',
      name: 'Template',
      description: 'Example',
      widgets: [],
    });
    expect(saved.id).toBe('template-1');
  });
});
