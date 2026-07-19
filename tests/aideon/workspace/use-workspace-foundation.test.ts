import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/adapters/ipc', () => ({ invokeIpc: vi.fn() }));
vi.mock('@/adapters/workspace-events', () => ({
  prepareForRunTerminal: vi.fn(),
  waitForWorkspaceReady: vi.fn(),
}));

import { invokeIpc } from '@/adapters/ipc';
import { prepareForRunTerminal } from '@/adapters/workspace-events';
import { useWorkspaceFoundation } from '@/aideon/workspace/use-workspace-foundation';

const invokeMock = vi.mocked(invokeIpc);
const terminalMock = vi.mocked(prepareForRunTerminal);

/** The `workspace_open` response shared by every test that opens a workspace. */
function mockWorkspaceOpenResult() {
  return Promise.resolve({
    workspaceId: 'workspace',
    partitionId: 'partition',
    workspaceFormatVersion: 1,
    appliedOpCount: 0,
    foundationRebuildHash: 'a'.repeat(64),
  });
}

describe('useWorkspaceFoundation authoring intents', () => {
  beforeEach(() => {
    invokeMock.mockReset();
    terminalMock.mockReset();
  });

  it('reuses the intent key when the same authoring request is retried', async () => {
    const intentKeys: string[] = [];
    let submission = 0;
    terminalMock.mockResolvedValue({
      wait: () =>
        Promise.resolve({
          runId: 'accepted-run',
          correlationId: 'request-2',
          succeeded: true,
          // Generated wire types use null for an absent Option.
          // eslint-disable-next-line unicorn/no-null
          errorCode: null,
        }),
    });
    invokeMock.mockImplementation((command, _payload, options) => {
      if (command === 'workspace_apply_change_event') {
        intentKeys.push(options?.idempotencyKey ?? '');
        submission += 1;
        if (submission === 1) return Promise.reject(new Error('transport interrupted'));
        return Promise.resolve({
          runId: 'accepted-run',
          queueClass: 'authoring',
          idempotencyKey: intentKeys[1],
          ledgerRef: 'ops/runs/accepted-run/run.json',
          acceptedAt: '2026-07-19T00:00:00Z',
        });
      }
      if (command === 'workspace_status') {
        return Promise.resolve({
          workspaceId: 'workspace',
          partitionId: 'partition',
          workspaceFormatVersion: 1,
          appliedOpCount: 1,
          foundationRebuildHash: 'a'.repeat(64),
        });
      }
      return Promise.resolve([]);
    });
    const { result } = renderHook(() => useWorkspaceFoundation());

    await act(async () => {
      await result.current[1].authorTypedNode('Capability', { name: 'Customer Insight' });
      await result.current[1].authorTypedNode('Capability', { name: 'Customer Insight' });
    });

    expect(intentKeys).toHaveLength(2);
    expect(intentKeys[0]).not.toBe('');
    expect(intentKeys[1]).toBe(intentKeys[0]);
  });
});

describe('useWorkspaceFoundation refresh parallelism (#796)', () => {
  beforeEach(() => {
    invokeMock.mockReset();
    terminalMock.mockReset();
  });

  it('dispatches all five refresh reads before any of them resolves', async () => {
    const dispatched: string[] = [];
    const deferred = new Map<string, { resolve: (value: unknown) => void }>();

    invokeMock.mockImplementation((command) => {
      if (command === 'workspace_open') {
        return mockWorkspaceOpenResult();
      }
      dispatched.push(command);
      return new Promise((resolve) => {
        deferred.set(command, { resolve });
      });
    });

    const { result } = renderHook(() => useWorkspaceFoundation());

    const openPromise = act(async () => {
      await result.current[1].openWorkspace('workspace-root');
    });

    // All five reads must have been dispatched even though none has resolved yet.
    const expectedCommands = [
      'workspace_edges',
      'workspace_metamodel_types',
      'workspace_nodes',
      'workspace_state_at',
      'workspace_status',
    ];
    await vi.waitFor(() => {
      expect(dispatched.toSorted((a, b) => a.localeCompare(b))).toEqual(expectedCommands);
    });

    for (const command of dispatched) {
      const fallback = command === 'workspace_status' ? {} : [];
      deferred.get(command)?.resolve(fallback);
    }
    await openPromise;

    expect(result.current[0].phase).toBe('open');
  });

  it('surfaces a rejected refresh read as an error phase', async () => {
    invokeMock.mockImplementation((command) => {
      if (command === 'workspace_open') {
        return mockWorkspaceOpenResult();
      }
      if (command === 'workspace_edges') {
        return Promise.reject(new Error('edges read failed'));
      }
      return Promise.resolve([]);
    });

    const { result } = renderHook(() => useWorkspaceFoundation());

    await act(async () => {
      await result.current[1].openWorkspace('workspace-root');
    });

    expect(result.current[0].phase).toBe('error');
    expect(result.current[0].errorMessage).toContain('edges read failed');
  });
});
