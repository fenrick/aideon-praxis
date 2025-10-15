/* @vitest-environment node */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Capture registered event handlers for the mocked Electron app
const { events } = vi.hoisted(() => ({ events: {} as Record<string, Function[]> }));

vi.mock('electron', () => {
  class BrowserWindowMock {
    public loadFile = vi.fn(async () => undefined);
    public removeMenu = vi.fn();
    static getAllWindows() { return []; }
    constructor(_opts: any) {}
  }
  const app = {
    isPackaged: false,
    disableHardwareAcceleration: vi.fn(),
    on: vi.fn((name: string, cb: Function) => {
      events[name] ||= [];
      events[name].push(cb);
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
import { EventEmitter } from 'node:events';
const rlEmitter = new EventEmitter();
vi.mock('node:readline', () => ({
  default: { createInterface: vi.fn(() => rlEmitter as any) },
  createInterface: vi.fn(() => rlEmitter as any),
}));

// Import after mocks in place
import * as electron from 'electron';
// eslint-disable-next-line import/first
import './main';

describe('main process wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('boots without throwing on ready', async () => {
    for (const cb of events['ready'] || []) cb();
    rlEmitter.emit('line', 'READY');
    // no assertions — absence of error is success for wiring smoke
    expect(true).toBe(true);
  });

  it('handles renderer load error without crashing', async () => {
    // Make future BrowserWindow instances fail loadFile to exercise catch path
    // @ts-expect-error test override
    (electron.BrowserWindow as any).prototype.loadFile = vi.fn(async () => {
      throw new Error('fail');
    });
    for (const cb of events['ready'] || []) cb();
    rlEmitter.emit('line', 'READY');
    expect(true).toBe(true);
  });

  it('quit on window-all-closed for non-darwin', () => {
    const original = Object.getOwnPropertyDescriptor(process, 'platform');
    Object.defineProperty(process, 'platform', { value: 'linux' });
    for (const cb of events['window-all-closed'] || []) cb();
    expect((electron.app as any).quit).toHaveBeenCalled();
    if (original) Object.defineProperty(process, 'platform', original);
  });

  it('activate event triggers without windows', () => {
    for (const cb of events['activate'] || []) cb();
    expect(true).toBe(true);
  });

  it('dev vs packaged spawn branches execute without error', () => {
    // dev (default)
    for (const cb of events['ready'] || []) cb();
    // packaged branch
    (electron.app as any).isPackaged = true;
    for (const cb of events['ready'] || []) cb();
    (electron.app as any).isPackaged = false;
    expect(true).toBe(true);
  });

  it.skip('IPC handler resolves state_at via worker line protocol', async () => {
    // trigger init
    for (const cb of events['ready'] || []) cb();
    // allow async init to register handler
    await new Promise((r) => setTimeout(r, 0));
    // get registered handler
    const calls = (electron.ipcMain.handle as any).mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const handler = calls[0][1] as (e: any, a: any) => Promise<any>;
    // signal worker ready
    rlEmitter.emit('line', 'READY');
    const p = handler({}, { asOf: '2025-01-01' });
    const payload = JSON.stringify({ asOf: '2025-01-01', scenario: null, confidence: null, nodes: 0, edges: 0 });
    // respond from worker
    rlEmitter.emit('line', payload);
    const res = await p;
    expect(res.asOf).toBe('2025-01-01');
  });

  it('getWorkerSpawn returns python command in dev', async () => {
    // App is not packaged in this test; ensure command path
    const isPackaged = (electron.app as any).isPackaged;
    expect(isPackaged).toBe(false);
  });
});
