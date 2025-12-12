import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Prepare DOM root before importing module that bootstraps React.
beforeEach(() => {
  document.body.innerHTML = '<div id="root"></div>';
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

    expect(await screen.findByText(/Loading workspace/i)).toBeInTheDocument();
  });

  it('invokes host when frontend becomes ready in tauri', async () => {
    const invoke = vi.fn();
    vi.doMock('@tauri-apps/api/core', () => ({ invoke }));
    const module = await import('./main');
    vi.spyOn(module, 'isTauriRuntime').mockReturnValue(true);
    render(
      <module.FrontendReady>
        <div>ready</div>
      </module.FrontendReady>,
    );

    expect(await screen.findByText('ready')).toBeInTheDocument();
    expect(invoke).toHaveBeenCalledWith('set_complete', { task: 'frontend' });
  });

  it('detects tauri runtime using meta env', async () => {
    vi.resetModules();
    Object.assign(import.meta, { env: { TAURI_PLATFORM: 'macos' } });
    const { isTauriRuntime } = await import('./main');

    expect(isTauriRuntime()).toBe(true);
  });
});
