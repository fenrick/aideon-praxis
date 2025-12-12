import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./styles.css', () => ({}), { virtual: true });
vi.mock('./root', () => ({ AideonDesktopRoot: () => <div>Root</div> }));
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn().mockResolvedValue(true) }));

// Prepare DOM root before importing module that bootstraps React.
beforeEach(() => {
  document.body.innerHTML = '<div id="root"></div>';
  Object.assign(import.meta, { env: {} });
});

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe('main entry', () => {
  it('renders splash screen when hash points to splash in browser mode', async () => {
    globalThis.location.hash = '#/splash';
    const module = await import('./main');
    vi.spyOn(module, 'isTauriRuntime').mockReturnValue(false);

    render(<module.AppEntry />);

    const roots = await screen.findAllByText(/Root/i);
    expect(roots.length).toBeGreaterThan(0);
  });

  it('invokes host when frontend becomes ready in tauri', async () => {
    (globalThis as { __TAURI__?: unknown }).__TAURI__ = {};
    const module = await import('./main');
    const { invoke } = await import('@tauri-apps/api/core');
    act(() => {
      render(
        <module.FrontendReady>
          <div>ready</div>
        </module.FrontendReady>,
      );
    });

    expect(await screen.findByText('ready')).toBeInTheDocument();
    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('set_complete', { task: 'frontend' });
    });
  });

  it('detects tauri runtime using meta env', async () => {
    vi.resetModules();
    Object.defineProperty(import.meta, 'env', {
      value: { TAURI_PLATFORM: 'macos' },
      configurable: true,
    });
    (globalThis as { __TAURI__?: unknown }).__TAURI__ = {};
    const { isTauriRuntime } = await import('./main');

    expect(isTauriRuntime()).toBe(true);
  });
});
