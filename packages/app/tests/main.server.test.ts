/* @vitest-environment node */
// Force server mode for this test file
process.env.AIDEON_USE_UV_SERVER = '1';
import { describe, it, expect, vi } from 'vitest';

type Listener = (...arguments_: unknown[]) => void;
const { events } = vi.hoisted(() => ({ events: new Map<string, Listener[]>() }));

vi.mock('electron', () => {
  class BrowserWindowMock {
    public loadFile = vi.fn(() => Promise.resolve());
    public removeMenu = vi.fn();
    static getAllWindows() {
      return [];
    }
  }
  const app = {
    isPackaged: false,
    disableHardwareAcceleration: vi.fn(),
    on: vi.fn((name: string, callback: Listener) => {
      const list = events.get(name) ?? [];
      list.push(callback);
      events.set(name, list);
    }),
    quit: vi.fn(),
  };
  const ipcMain = { handle: vi.fn() };
  return { app, BrowserWindow: BrowserWindowMock, ipcMain };
});

// Mock spawn and http client
vi.mock('node:child_process', () => ({
  spawn: vi.fn(() => ({
    stdin: { write: vi.fn() },
    stdout: { on: vi.fn() },
    on: vi.fn(),
  })),
}));

const { httpRequestMock } = vi.hoisted(() => ({ httpRequestMock: vi.fn() }));
vi.mock('node:http', async () => {
  return {
    default: { request: httpRequestMock },
    request: httpRequestMock,
  } as unknown as Record<string, unknown>;
});

import '../src/main';
import * as electron from 'electron';

describe('main process server mode', () => {
  it('calls FastAPI over UDS with scenario/confidence', async () => {
    // Start app
    for (const callback of events.get('ready') ?? []) callback();
    // Allow main.ts to register ipcMain handlers
    await new Promise((resolve) => setTimeout(resolve, 0));
    // Wire http request to return a JSON body
    httpRequestMock.mockImplementation((_options: unknown, callback: (response: any) => void) => {
      const dataHandlers: ((c?: unknown) => void)[] = [];
      const endHandlers: (() => void)[] = [];
      const response = {
        on(event: 'data' | 'end', function_: (c?: unknown) => void) {
          if (event === 'data') dataHandlers.push(function_);
          else endHandlers.push(function_ as () => void);
        },
        emit(event: 'data' | 'end', payload?: unknown) {
          if (event === 'data') for (const function_ of dataHandlers) function_(payload);
          else for (const function_ of endHandlers) function_();
        },
      } as const;
      setTimeout(() => {
        callback(response);
        response.emit(
          'data',
          Buffer.from(
            JSON.stringify({
              asOf: '2025-01-01',
              scenario: null,
              confidence: null,
              nodes: 0,
              edges: 0,
            }),
          ),
        );
        response.emit('end');
      }, 0);
      return { on: vi.fn(), end: vi.fn() };
    });

    // Get handler and invoke
    const calls = (electron.ipcMain.handle as unknown as { mock: { calls: unknown[] } }).mock
      .calls as [string, (...arguments_: unknown[]) => unknown][];
    const [, handler] = calls.at(-1) as [
      string,
      (event: unknown, a: { asOf: string }) => Promise<any>,
    ];
    const result = await handler({}, { asOf: '2025-01-01', scenario: 's1', confidence: 0.5 });
    expect(result.asOf).toBe('2025-01-01');
  });

  it('calls FastAPI over UDS with only asOf', async () => {
    // Start app
    for (const callback of events.get('ready') ?? []) callback();
    await new Promise((resolve) => setTimeout(resolve, 0));
    // Rewire http request mock for this case
    httpRequestMock.mockImplementation((_options: unknown, callback: (response: any) => void) => {
      const dataHandlers: ((c?: unknown) => void)[] = [];
      const endHandlers: (() => void)[] = [];
      const response = {
        on(event: 'data' | 'end', function_: (c?: unknown) => void) {
          if (event === 'data') dataHandlers.push(function_);
          else endHandlers.push(function_ as () => void);
        },
        emit(event: 'data' | 'end', payload?: unknown) {
          if (event === 'data') for (const function_ of dataHandlers) function_(payload);
          else for (const function_ of endHandlers) function_();
        },
      } as const;
      setTimeout(() => {
        callback(response);
        response.emit(
          'data',
          Buffer.from(
            JSON.stringify({
              asOf: '2025-01-01',
              scenario: null,
              confidence: null,
              nodes: 0,
              edges: 0,
            }),
          ),
        );
        response.emit('end');
      }, 0);
      return { on: vi.fn(), end: vi.fn() };
    });

    // Get handler and invoke with only asOf
    const calls = (electron.ipcMain.handle as unknown as { mock: { calls: unknown[] } }).mock
      .calls as [string, (...arguments_: unknown[]) => unknown][];
    const [, handler] = calls.at(-1) as [
      string,
      (event: unknown, a: { asOf: string }) => Promise<any>,
    ];
    const result = await handler({}, { asOf: '2025-01-01' });
    expect(result.asOf).toBe('2025-01-01');
  });
});
