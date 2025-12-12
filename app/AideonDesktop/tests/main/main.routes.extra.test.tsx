import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('../../src/root', () => ({ AideonDesktopRoot: () => <div>Root</div> }));
vi.mock('../../src/styles.css', () => ({}));

beforeEach(() => {
  document.body.innerHTML = '<div id="root"></div>';
  globalThis.location.hash = '#/about';
});

describe('AppEntry routes', () => {
  it('renders about screen when hash route is /about in browser mode', async () => {
    const module = await import('../../src/main');
    vi.spyOn(module, 'isTauriRuntime').mockReturnValue(false);
    const { AppEntry } = module;

    render(<AppEntry />);

    const about = await screen.findAllByText(/Desktop shell for Praxis Canvas and tools/i);
    expect(about.length).toBeGreaterThan(0);
  });
});
