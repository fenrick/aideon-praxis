import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/logging', () => ({
  logMessage: vi.fn(() => Promise.resolve()),
}));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

import { HostIpcError, invokeIpc } from '@/adapters/ipc';
import { logMessage } from '@/lib/logging';
import { invoke } from '@tauri-apps/api/core';
import { buildErrorResponse, buildOkResponse } from '../tauri-mocks';

const mockedLogMessage = vi.mocked(logMessage, true);
const mockedInvoke = vi.mocked(invoke, true);

describe('invokeIpc instrumentation', () => {
  beforeEach(() => {
    mockedLogMessage.mockClear();
    mockedInvoke.mockClear();
  });

  it('logs command invocation and completion on success', async () => {
    mockedInvoke.mockImplementationOnce((_command, arguments_) =>
      Promise.resolve(buildOkResponse(arguments_, 'value')),
    );

    const result = await invokeIpc('test.command', { foo: 'bar' });

    expect(result).toBe('value');
    expect(mockedLogMessage).toHaveBeenCalledTimes(2);

    const startCall = mockedLogMessage.mock.calls[0]?.[0];
    const finishCall = mockedLogMessage.mock.calls[1]?.[0];
    expect(startCall).toBeDefined();
    expect(finishCall).toBeDefined();
    expect(startCall?.eventName).toBe('command_invoked');
    expect(finishCall?.eventName).toBe('command_completed');
    expect(startCall?.correlationId).toBeDefined();
    expect(startCall?.correlationId).toBe(finishCall?.correlationId);
    expect(startCall?.metadata?.command).toBe('test.command');
    expect(finishCall?.metadata?.status).toBe('ok');
  });

  it('logs failure when host responds with error envelope', async () => {
    mockedInvoke.mockImplementationOnce((_command, arguments_) =>
      Promise.resolve(
        buildErrorResponse(arguments_, {
          code: 'boom',
          // RFC-9457 Problem Detail: the human explanation is `detail`.
          detail: 'failure',
          details: { source: 'host' },
        }),
      ),
    );

    await expect(invokeIpc('test.command', {})).rejects.toBeInstanceOf(HostIpcError);
    expect(mockedLogMessage).toHaveBeenCalledTimes(2);

    const failureEntry = mockedLogMessage.mock.calls[1]?.[0];
    expect(failureEntry).toBeDefined();
    if (!failureEntry) {
      throw new Error('Expected a failure log entry');
    }
    const loggedEntry = failureEntry;
    expect(loggedEntry.eventName).toBe('command_failed');
    expect(loggedEntry.metadata?.error_kind).toBe('boom');
    expect(loggedEntry.metadata?.error_message).toBe('failure');
  });

  it('logs failure when invoke rejects', async () => {
    mockedInvoke.mockRejectedValueOnce(new Error('transport'));

    await expect(invokeIpc('test.command', {})).rejects.toThrow('transport');
    expect(mockedLogMessage).toHaveBeenCalledTimes(2);

    const failureEntry = mockedLogMessage.mock.calls[1]?.[0];
    expect(failureEntry).toBeDefined();
    if (!failureEntry) {
      throw new Error('Expected a failure log entry');
    }
    const loggedEntry = failureEntry;
    expect(loggedEntry.eventName).toBe('command_failed');
    expect(loggedEntry.metadata?.error_message).toBe('transport');
  });
});
