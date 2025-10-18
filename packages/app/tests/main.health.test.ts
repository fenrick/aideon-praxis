/* @vitest-environment node */
import { describe, it, expect, vi } from 'vitest';

// Mock Electron app to satisfy side effects in main.ts
vi.mock('electron', () => {
  const app = { disableHardwareAcceleration: vi.fn(), on: vi.fn(), isPackaged: false };
  class BrowserWindowMock {
    public loadFile = vi.fn(() => Promise.resolve());
    public removeMenu = vi.fn();
    static getAllWindows() {
      return [] as unknown[];
    }
  }
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
    httpRequestMock.mockImplementation(
      (_options: unknown, callback: (responseArgument: any) => void) => {
        const dataHandlers: ((c?: unknown) => void)[] = [];
        const endHandlers: (() => void)[] = [];
        const response = {
          on(event: 'data' | 'end', function_: (c?: unknown) => void) {
            if (event === 'data') dataHandlers.push(function_);
            else endHandlers.push(function_ as () => void);
          },
        } as const;
        setTimeout(() => {
          callback(response);
          for (const function_ of dataHandlers) function_(Buffer.from('{"status":"ok"}'));
          for (const function_ of endHandlers) function_();
        }, 0);
        return { on: vi.fn(), end: vi.fn() };
      },
    );
    const result = await __test__.httpHealthOverUds('.aideon-test.sock');
    expect(result.status).toBe('ok');
  });

  it('waitForServerReady times out on errors', async () => {
    httpRequestMock.mockImplementation(
      (_options: unknown, _callback: (responseArgument: any) => void) => {
        const request = { on: vi.fn(), end: vi.fn() };
        setTimeout(() => {
          const first = (request.on as any).mock.calls[0];
          if (first) first[1](new Error('fail'));
        }, 0);
        return request;
      },
    );
    const start = Date.now();
    await __test__.waitForServerReady('.aideon-test.sock', 10);
    expect(Date.now() - start).toBeGreaterThanOrEqual(10);
  });

  it('waitForServerReady returns quickly on success', async () => {
    httpRequestMock.mockImplementation(
      (_options: unknown, callback: (responseArgument: any) => void) => {
        const dataHandlers: ((c?: unknown) => void)[] = [];
        const endHandlers: (() => void)[] = [];
        const response = {
          on(event: 'data' | 'end', function_: (c?: unknown) => void) {
            if (event === 'data') dataHandlers.push(function_);
            else endHandlers.push(function_ as () => void);
          },
        } as const;
        setTimeout(() => {
          callback(response);
          for (const function_ of dataHandlers) function_(Buffer.from('{"status":"ok"}'));
          for (const function_ of endHandlers) function_();
        }, 0);
        return { on: vi.fn(), end: vi.fn() };
      },
    );
    const start = Date.now();
    await __test__.waitForServerReady('.aideon-test.sock', 200);
    expect(Date.now() - start).toBeLessThan(100);
  });
});
