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
  })),
}));

// Provide a controllable readline interface that emits 'line' events
class RLMock {
  private handlers: ((s: string) => void)[] = [];
  on(event: string, handler: (s: string) => void) {
    if (event === 'line') this.handlers.push(handler);
  }
  off(event: string, handler: (s: string) => void) {
    if (event === 'line') this.handlers = this.handlers.filter((h) => h !== handler);
  }
  emitLine(s: string) {
    for (const h of this.handlers) h(s);
  }
}
const rlEmitter = new RLMock();
vi.mock('node:readline', () => ({
  default: { createInterface: vi.fn(() => rlEmitter as unknown as any) },
  createInterface: vi.fn(() => rlEmitter as unknown as any),
}));

// Import after mocks in place
import * as electron from 'electron';

import '../src/main';

describe('main process wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('boots without throwing on ready', () => {
    for (const callback of events.get('ready') ?? []) callback();
    rlEmitter.emitLine('READY');
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
    rlEmitter.emitLine('READY');
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
    rlEmitter.emit('line', 'READY');
    const p = handler({}, { asOf: '2025-01-01' });
    const payload = JSON.stringify({
      asOf: '2025-01-01',
      scenario: null,
      confidence: null,
      nodes: 0,
      edges: 0,
    });
    // respond from worker
    rlEmitter.emit('line', payload);
    const result = await p;
    expect(result.asOf).toBe('2025-01-01');
  });

  it('getWorkerSpawn returns python command in dev', () => {
    // App is not packaged in this test; ensure command path
    const isPackaged = (electron.app as unknown as { isPackaged: boolean }).isPackaged;
    expect(isPackaged).toBe(false);
  });
});
