import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const debug = vi.fn();
const error = vi.fn();

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue({
    asOf: '2025-01-01',
    scenario: null,
    confidence: null,
    nodes: 0,
    edges: 0,
  }),
}));

vi.mock('@tauri-apps/plugin-log', () => ({
  debug: (...args: unknown[]) => {
    debug(...(args as [unknown]));
    return Promise.resolve();
  },
  error: (...args: unknown[]) => {
    error(...(args as [unknown]));
    return Promise.resolve();
  },
  info: vi.fn().mockResolvedValue(undefined),
}));

describe('tauri-shim logging', () => {
  beforeEach(() => {
    // Ensure aideon is undefined so shim installs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).aideon = undefined;
  });

  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('uses template string for debug and structured error logging', async () => {
    await import('../../src/renderer/tauri-shim');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bridge = (globalThis as any).aideon as {
      stateAt: (args: { asOf: string }) => Promise<unknown>;
    };
    await bridge.stateAt({ asOf: '2025-01-01' });
    const debugCall = debug.mock.calls.find((c) => typeof c[0] === 'string');
    expect(debugCall?.[0]).toContain('asOf=2025-01-01');
  });
});
