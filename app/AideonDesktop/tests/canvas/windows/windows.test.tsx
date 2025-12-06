import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue(),
}));

import { AboutWindow } from 'canvas/windows/about';
import { SettingsWindow } from 'canvas/windows/settings';
import SplashWindow from 'canvas/windows/splash';
import { StatusWindow } from 'canvas/windows/status';
import { StyleguideWindow } from 'canvas/windows/styleguide';

afterEach(() => {
  cleanup();
});

describe('desktop windows', () => {
  it('renders About window copy', () => {
    render(<AboutWindow />);
    expect(screen.getByText(/Aideon Praxis/i)).toBeInTheDocument();
    expect(screen.getByText(/Twin-orbit decision tooling/i)).toBeInTheDocument();
  });

  it('shows status with bridge version when present', () => {
    (globalThis as { aideon?: { version?: string } }).aideon = { version: 'v0.9.0' };
    render(<StatusWindow />);
    expect(screen.getByText(/Status:/)).toBeInTheDocument();
    const bridgeBadges = screen.getAllByText(
      (_, node) => node?.textContent?.includes('Bridge:') ?? false,
    );
    expect(bridgeBadges.some((badge) => badge.textContent?.includes('v0.9.0'))).toBe(true);
  });

  it('lets users toggle theme in settings window', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        clear: vi.fn(),
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
      configurable: true,
    });
    globalThis.localStorage.clear();
    render(<SettingsWindow />);
    const dark = screen.getByLabelText('Dark');
    fireEvent.click(dark);
    expect(dark).toBeChecked();
    expect(document.body).toHaveClass('theme-dark');
  });

  it('rotates splash load lines and calls init without crashing', async () => {
    vi.useFakeTimers();
    render(<SplashWindow />);
    expect(screen.getByText(/Aideon Praxis/)).toBeInTheDocument();
    vi.advanceTimersByTime(1600);
    expect(screen.getByText(/splines|weaving|replaying/i)).toBeInTheDocument();
    await vi.advanceTimersByTimeAsync(3200);
    vi.useRealTimers();
  });

  it('renders styleguide heading and accent selector', () => {
    document.body.style.setProperty('--accent', '#ff0000');
    render(<StyleguideWindow />);
    expect(screen.getByText(/Praxis styleguide/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Accent token/i).length).toBeGreaterThan(0);
  });
});
