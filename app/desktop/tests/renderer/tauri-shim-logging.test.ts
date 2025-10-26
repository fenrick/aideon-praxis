import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const invokeMock = vi.fn();
const debug = vi.fn();
const error = vi.fn();
const info = vi.fn();

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
}));

vi.mock('@tauri-apps/plugin-log', () => ({
  debug: (...args: unknown[]) => debug(...(args as [unknown])) as unknown,
  error: (...args: unknown[]) => error(...(args as [unknown])) as unknown,
  info: (...args: unknown[]) => info(...(args as [unknown])) as unknown,
}));

describe('tauri-shim logging', () => {
  const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

  beforeEach(() => {
    // Ensure aideon is undefined so shim installs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).aideon = undefined;
    invokeMock.mockImplementation((command: unknown) => {
      if (command === 'temporal_state_at') {
        return Promise.resolve({
          asOf: '2025-01-01',
          scenario: null,
          confidence: null,
          nodes: 0,
          edges: 0,
        });
      }
      return Promise.resolve();
    });
    debug.mockResolvedValue(undefined);
    error.mockResolvedValue(undefined);
    info.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    consoleWarn.mockClear();
  });

  it('uses template string for debug and structured error logging', async () => {
    await import('../../src/lib/tauri-shim');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bridge = (globalThis as any).aideon as {
      stateAt: (args: { asOf: string }) => Promise<unknown>;
    };
    await bridge.stateAt({ asOf: '2025-01-01' });
    const debugCall = debug.mock.calls.find((c) => typeof c[0] === 'string');
    expect(debugCall?.[0]).toContain('asOf=2025-01-01');
  });

  it('does not overwrite an existing aideon bridge', async () => {
    const existing = { sentinel: true };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).aideon = existing;
    await import('../../src/lib/tauri-shim');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((globalThis as any).aideon).toBe(existing);
  });

  it('logs a warning when logging fails in dev mode', async () => {
    debug.mockRejectedValue(new Error('boom'));
    await import('../../src/lib/tauri-shim');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bridge = (globalThis as any).aideon as {
      stateAt: (args: { asOf: string }) => Promise<unknown>;
    };
    await bridge.stateAt({ asOf: '2025-01-02' }).catch(() => undefined);
    expect(consoleWarn).toHaveBeenCalledWith('renderer: log fallback', expect.any(Error));
  });

  it('skips warning when logging fails outside dev mode', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).__AIDEON_DEV__ = false;
    debug.mockRejectedValue(new Error('hidden'));
    await import('../../src/lib/tauri-shim');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bridge = (globalThis as any).aideon as {
      stateAt: (args: { asOf: string }) => Promise<unknown>;
    };
    await bridge.stateAt({ asOf: '2025-03-01' }).catch(() => undefined);
    expect(consoleWarn).not.toHaveBeenCalled();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).__AIDEON_DEV__;
  });

  it('propagates invoke errors and logs them', async () => {
    invokeMock.mockImplementation((command: unknown) => {
      if (command === 'temporal_state_at') {
        return Promise.resolve({
          asOf: '2025-01-01',
          scenario: null,
          confidence: null,
          nodes: 0,
          edges: 0,
        });
      }
      return command === 'open_settings'
        ? Promise.reject(new Error('invoke failed'))
        : Promise.resolve();
    });
    await import('../../src/lib/tauri-shim');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bridge = (globalThis as any).aideon as {
      openSettings: () => Promise<void>;
    };
    await expect(bridge.openSettings()).rejects.toThrow('invoke failed');
    const errorCall = error.mock.calls.find((c) => typeof c[0] === 'string');
    expect(errorCall?.[0]).toContain('invoke open_settings failed');
  });

  it('invokes about and status commands successfully', async () => {
    await import('../../src/lib/tauri-shim');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bridge = (globalThis as any).aideon as {
      openAbout: () => Promise<void>;
      openStatus: () => Promise<void>;
    };
    await bridge.openAbout();
    await bridge.openStatus();
    expect(invokeMock).toHaveBeenCalledWith('open_about');
    expect(invokeMock).toHaveBeenCalledWith('open_status');
  });

  it('propagates stateAt errors with message inspection', async () => {
    const rejection = { message: 'backend unavailable' };
    invokeMock.mockImplementation((command: unknown) => {
      if (command === 'temporal_state_at') {
        return Promise.reject(rejection);
      }
      return Promise.resolve();
    });
    await import('../../src/lib/tauri-shim');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bridge = (globalThis as any).aideon as {
      stateAt: (args: { asOf: string }) => Promise<unknown>;
    };
    await expect(bridge.stateAt({ asOf: '2025-02-01' })).rejects.toBe(rejection);
    const errorCall = error.mock.calls.find((c) => typeof c[0] === 'string');
    expect(errorCall?.[0]).toContain('invoke temporal_state_at failed: backend unavailable');
  });

  it('logs fallback message when openStatus error lacks details', async () => {
    invokeMock.mockImplementation((command: unknown) => {
      if (command === 'open_status') {
        return Promise.reject('fatal');
      }
      if (command === 'temporal_state_at') {
        return Promise.resolve({
          asOf: '2025-01-01',
          scenario: null,
          confidence: null,
          nodes: 0,
          edges: 0,
        });
      }
      return Promise.resolve();
    });
    await import('../../src/lib/tauri-shim');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bridge = (globalThis as any).aideon as {
      openStatus: () => Promise<void>;
    };
    await expect(bridge.openStatus()).rejects.toBe('fatal');
    const errorCall = error.mock.calls.find((c) => typeof c[0] === 'string');
    expect(errorCall?.[0]).toContain('invoke open_status failed: fatal');
  });

  it('logs about errors with extracted message', async () => {
    invokeMock.mockImplementation((command: unknown) => {
      if (command === 'open_about') {
        return Promise.reject(new Error('about boom'));
      }
      if (command === 'temporal_state_at') {
        return Promise.resolve({
          asOf: '2025-01-01',
          scenario: null,
          confidence: null,
          nodes: 0,
          edges: 0,
        });
      }
      return Promise.resolve();
    });
    await import('../../src/lib/tauri-shim');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bridge = (globalThis as any).aideon as {
      openAbout: () => Promise<void>;
    };
    await expect(bridge.openAbout()).rejects.toThrow('about boom');
    const errorCall = error.mock.calls.find((c) => typeof c[0] === 'string');
    expect(errorCall?.[0]).toContain('invoke open_about failed: about boom');
  });

  it('handles string-based stateAt errors', async () => {
    invokeMock.mockImplementation((command: unknown) => {
      if (command === 'temporal_state_at') {
        return Promise.reject('timeout');
      }
      return Promise.resolve();
    });
    await import('../../src/lib/tauri-shim');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bridge = (globalThis as any).aideon as {
      stateAt: (args: { asOf: string }) => Promise<unknown>;
    };
    await expect(bridge.stateAt({ asOf: '2025-02-02' })).rejects.toBe('timeout');
    const errorCall = error.mock.calls.find((c) => typeof c[0] === 'string');
    expect(errorCall?.[0]).toContain('invoke temporal_state_at failed: timeout');
  });

  it('handles string-based openSettings errors', async () => {
    invokeMock.mockImplementation((command: unknown) => {
      if (command === 'open_settings') {
        return Promise.reject('denied');
      }
      if (command === 'temporal_state_at') {
        return Promise.resolve({
          asOf: '2025-01-01',
          scenario: null,
          confidence: null,
          nodes: 0,
          edges: 0,
        });
      }
      return Promise.resolve();
    });
    await import('../../src/lib/tauri-shim');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bridge = (globalThis as any).aideon as {
      openSettings: () => Promise<void>;
    };
    await expect(bridge.openSettings()).rejects.toBe('denied');
    const errorCall = error.mock.calls.find((c) => typeof c[0] === 'string');
    expect(errorCall?.[0]).toContain('invoke open_settings failed: denied');
  });
});
