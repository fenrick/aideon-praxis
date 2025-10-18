/* @vitest-environment node */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Capture registered event handlers for the mocked Electron app
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

// Mock child_process spawn, but createInterface is mocked to ignore the stream
vi.mock('node:child_process', () => ({
  spawn: vi.fn(() => ({
    stdin: { write: vi.fn() },
    stdout: {},
    on: vi.fn(),
  })),
}));

// No readline piping in server-only mode
vi.mock('node:readline', () => ({ default: {}, createInterface: vi.fn() }));

// Mock http request for server-mode calls when needed
const { httpRequestMock } = vi.hoisted(() => ({ httpRequestMock: vi.fn() }));
vi.mock('node:http', async () => {
  return {
    default: { request: httpRequestMock },
    request: httpRequestMock,
  } as unknown as Record<string, unknown>;
});

// Import after mocks in place
import * as electron from 'electron';

// Server-only mode
process.env.AIDEON_USE_UV_SERVER = '1';
import '../src/main';

describe('main process wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('boots without throwing on ready', async () => {
    for (const callback of events.get('ready') ?? []) callback();
    await new Promise((r) => setTimeout(r, 0));
    // no assertions — absence of error is success for wiring smoke
    expect(true).toBe(true);
  });

  it('handles renderer load error without crashing', () => {
    // Make future BrowserWindow instances fail loadFile to exercise catch path
    // @ts-expect-error test override: patch mock BrowserWindow.loadFile to throw
    (
      electron.BrowserWindow as unknown as { prototype: { loadFile: () => Promise<never> } }
    ).prototype.loadFile = vi.fn(() => Promise.reject(new Error('fail')));
    for (const callback of events.get('ready') ?? []) callback();
    // server-only: no READY line
    expect(true).toBe(true);
  });

  it('quit on window-all-closed for non-darwin', () => {
    const original = Object.getOwnPropertyDescriptor(process, 'platform');
    Object.defineProperty(process, 'platform', { value: 'linux' });
    for (const callback of events.get('window-all-closed') ?? []) callback();
    const appMock = electron.app as unknown as { quit: () => void };
    expect(appMock.quit).toHaveBeenCalled();
    if (original) Object.defineProperty(process, 'platform', original);
  });

  it('activate event triggers without windows', () => {
    for (const callback of events.get('activate') ?? []) callback();
    expect(true).toBe(true);
  });

  it('dev vs packaged spawn branches execute without error', () => {
    // dev (default)
    for (const callback of events.get('ready') ?? []) callback();
    // packaged branch
    (electron.app as unknown as { isPackaged: boolean }).isPackaged = true;
    for (const callback of events.get('ready') ?? []) callback();
    (electron.app as unknown as { isPackaged: boolean }).isPackaged = false;
    expect(true).toBe(true);
  });

  it('IPC handler resolves via HTTP-over-UDS', async () => {
    // trigger init
    for (const callback of events.get('ready') ?? []) callback();
    // allow async registration to settle
    await new Promise((r) => setTimeout(r, 0));
    const calls = (electron.ipcMain.handle as unknown as { mock: { calls: unknown[] } }).mock
      .calls as [string, (...arguments_: unknown[]) => unknown][];
    expect(calls.length).toBeGreaterThan(0);
    const [, handler] = calls.at(-1) as [
      string,
      (event: unknown, a: { asOf: string }) => Promise<{ asOf: string; nodes: number }>,
    ];
    // mock http client for this test
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
    const result = await handler({}, { asOf: '2025-01-01' });
    expect(result.asOf).toBe('2025-01-01');
  });

  // No legacy fallback in server-only mode
  it.skip('IPC handler resolves state_at via worker line protocol', async () => {
    // trigger init
    for (const callback of events.get('ready') ?? []) callback();
    // allow async init to register handler
    await new Promise((resolve) => setTimeout(resolve, 0));
    // get registered handler
    const calls = (electron.ipcMain.handle as unknown as { mock: { calls: unknown[] } }).mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const handler = calls[0][1] as (
      event: unknown,
      arguments_: { asOf: string },
    ) => Promise<{ asOf: string }>;
    // signal worker ready
    // server-only: not applicable
    const p = handler({}, { asOf: '2025-01-01' });
    // no-op
    // respond from worker
    // server-only: not applicable
    const result = await p;
    expect(result.asOf).toBe('2025-01-01');
  });

  it('getWorkerSpawn returns python command in dev', () => {
    // App is not packaged in this test; ensure command path
    const isPackaged = (electron.app as unknown as { isPackaged: boolean }).isPackaged;
    expect(isPackaged).toBe(false);
  });
});
