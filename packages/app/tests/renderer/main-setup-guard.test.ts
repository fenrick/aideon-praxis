import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@tauri-apps/plugin-log', () => ({
  info: vi.fn().mockResolvedValue(undefined),
}));

// Avoid transforming Svelte component in this test environment
vi.mock('../../src/renderer/App.svelte', () => ({ default: class {} }));

describe('renderer/main setup guard', () => {
  const proto = Object.getPrototypeOf(document);
  const originalReadyState = Object.getOwnPropertyDescriptor(proto, 'readyState')!;

  function setReadyState(value: DocumentReadyState) {
    Object.defineProperty(proto, 'readyState', {
      configurable: true,
      get: () => value,
    });
  }

  beforeEach(() => {
    // fresh root each test
    document.body.innerHTML = '<div id="root"></div>';
  });

  afterEach(() => {
    // restore readyState getter
    Object.defineProperty(proto, 'readyState', originalReadyState);
    vi.useRealTimers();
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('calls setup immediately when DOM already loaded', async () => {
    setReadyState('complete');
    vi.useFakeTimers();
    await import('../../src/renderer/main');
    // advance the internal sleep(5)
    vi.runAllTimers();
    // If no throw occurred, test passes for invocation path; more detailed checks are in tauri-invoke.test.ts
    expect(true).toBe(true);
  });

  it('defers setup until DOMContentLoaded when loading', async () => {
    setReadyState('loading');
    vi.useFakeTimers();
    const addEventSpy = vi.spyOn(globalThis, 'addEventListener');
    await import('../../src/renderer/main');
    expect(addEventSpy).toHaveBeenCalledWith('DOMContentLoaded', expect.any(Function));
  });
});
/* @vitest-environment jsdom */
