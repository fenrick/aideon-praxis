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
