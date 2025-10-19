/* @vitest-environment node */
import { describe, it, expect, vi } from 'vitest';
import path from 'node:path';

// Mock Electron early to avoid touching real Electron in tests
vi.mock('electron', () => {
  const app = {
    isPackaged: false,
    disableHardwareAcceleration: vi.fn(),
    on: vi.fn(),
    quit: vi.fn(),
  };
  class BrowserWindowMock {
    public loadFile = vi.fn(() => Promise.resolve());
    public removeMenu = vi.fn();
    static getAllWindows() {
      return [];
    }
  }
  const ipcMain = { handle: vi.fn() };
  return { app, BrowserWindow: BrowserWindowMock, ipcMain };
});

import { __test__ } from '../src/main';

describe('UDS HTTP helpers error handling', () => {
  it('httpHealthOverUds rejects on invalid socket path', async () => {
    const badPath = path.join('/tmp', 'nonexistent-socket-path-should-fail.sock');
    await expect(__test__.httpHealthOverUds(badPath)).rejects.toBeInstanceOf(Error);
  });
});
