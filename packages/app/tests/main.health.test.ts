/* @vitest-environment node */
import { describe, it, expect, vi } from 'vitest';

// Mock Electron app to satisfy side effects in main.ts
vi.mock('electron', () => {
  const app = { disableHardwareAcceleration: vi.fn(), on: vi.fn(), isPackaged: false };
  class BrowserWindowMock {}
  const ipcMain = { handle: vi.fn() };
  return { app, BrowserWindow: BrowserWindowMock, ipcMain };
});

// Hoisted mock for http
const { httpRequestMock } = vi.hoisted(() => ({ httpRequestMock: vi.fn() }));
vi.mock('node:http', async () => {
  return {
    default: { request: httpRequestMock },
    request: httpRequestMock,
  } as unknown as Record<string, unknown>;
});

import { __test__ } from '../src/main';

describe('health helpers', () => {
  it('httpHealthOverUds returns ok', async () => {
    httpRequestMock.mockImplementation((_options: unknown, callback: (res: any) => void) => {
      const response = {
        on(event: 'data' | 'end', fn: (c?: unknown) => void) {
          if (event === 'data') setTimeout(() => fn(Buffer.from('{"status":"ok"}')), 0);
          else setTimeout(() => fn(), 1);
        },
      } as const;
      setTimeout(() => callback(response), 0);
      return { on: vi.fn(), end: vi.fn() };
    });
    const result = await __test__.httpHealthOverUds('/tmp/x.sock');
    expect(result.status).toBe('ok');
  });

  it('waitForServerReady times out on errors', async () => {
    httpRequestMock.mockImplementation((_options: unknown, _callback: (res: any) => void) => {
      const req = { on: vi.fn(), end: vi.fn() };
      // Immediately emit an error to force failure
      setTimeout(() => req.on.mock.calls.find(() => true)?.[1](new Error('fail')), 0);
      return req;
    });
    const start = Date.now();
    await __test__.waitForServerReady('/tmp/x.sock', 10);
    expect(Date.now() - start).toBeGreaterThanOrEqual(10);
  });

  it('waitForServerReady returns quickly on success', async () => {
    httpRequestMock.mockImplementation((_options: unknown, callback: (res: any) => void) => {
      const response = {
        on(event: 'data' | 'end', fn: (c?: unknown) => void) {
          if (event === 'data') setTimeout(() => fn(Buffer.from('{"status":"ok"}')), 0);
          else setTimeout(() => fn(), 1);
        },
      } as const;
      setTimeout(() => callback(response), 0);
      return { on: vi.fn(), end: vi.fn() };
    });
    const start = Date.now();
    await __test__.waitForServerReady('/tmp/x.sock', 200);
    expect(Date.now() - start).toBeLessThan(100);
  });
});
