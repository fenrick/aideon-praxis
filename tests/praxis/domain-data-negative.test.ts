import { afterEach, describe, expect, it, vi } from 'vitest';

import { clearTauriMocks, installTauriMocks } from '../tauri-mocks';

describe('domain-data negative paths', () => {
  afterEach(() => {
    clearTauriMocks();
  });

  it('throws when host invoke fails', async () => {
    const invokeMock = vi
      .fn<(command: string, arguments_: Record<string, unknown> | undefined) => unknown>()
      .mockRejectedValue(new Error('no host'));
    installTauriMocks({
      ipcHandler: (command, arguments_) => invokeMock(command, arguments_),
    });

    const { listLayoutsFromHost } = await import('praxis/domain-data');
    await expect(listLayoutsFromHost()).rejects.toThrow('Host command');
    expect(invokeMock).toHaveBeenCalled();
  });
});
