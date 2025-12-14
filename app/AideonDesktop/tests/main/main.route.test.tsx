import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/api/window', () => ({ getCurrentWindow: vi.fn(() => ({ label: 'status' })) }));

describe('main.tsx routing', () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = '<div id="root"></div>';
    // Ensure non-Tauri environment so hash-based routing is used
    (globalThis as { __TAURI__?: unknown }).__TAURI__ = undefined;
    // Hash route to status window
    globalThis.location.hash = '#/status';
  });

  it('renders status screen when hash route is /status in browser mode', async () => {
    await import('../../src/main');
    // Allow queueMicrotask inside AppEntry to run
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(document.body.textContent || '').toContain('Host status');
  });
});
