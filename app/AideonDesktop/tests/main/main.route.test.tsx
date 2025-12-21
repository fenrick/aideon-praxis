import { waitFor } from '@testing-library/dom';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/api/window', () => ({ getCurrentWindow: vi.fn(() => ({ label: 'status' })) }));

describe('main.tsx routing', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useRealTimers();
    document.body.innerHTML = '<div id="root"></div>';
    Object.assign(import.meta, { env: { VITEST: true } });
    // Ensure non-Tauri environment so hash-based routing is used
    const global = globalThis as { __TAURI__?: unknown; __TAURI_INTERNALS__?: unknown };
    global.__TAURI__ = undefined;
    global.__TAURI_INTERNALS__ = undefined;
    // Hash route to status window
    globalThis.location.hash = '#/status';
  });

  it(
    'renders status screen when hash route is /status in browser mode',
    async () => {
      const module = await import('../../src/main');
      const container = document.createElement('div');
      render(<module.AppEntry />, { container });
      // Allow queueMicrotask inside AppEntry to run
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));

      await waitFor(
        () => {
          expect(container.textContent || '').toContain('Host status');
        },
        { timeout: 10_000 },
      );
    },
    15_000,
  );
});
