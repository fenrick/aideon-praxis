import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn() }));

import { listen } from '@tauri-apps/api/event';

import {
  AboutScreen,
  FrontendReady,
  MainScreen,
  SettingsScreen,
  SplashScreenRoute,
  StatusScreen,
  StyleguideScreen,
} from '@/app/app-screens';
import { ColorThemeProvider } from 'design-system/theme/color-theme';
import { isTauriRuntime } from 'lib/runtime';

import {
  clearTauriMocks,
  findIpcCall,
  getIpcCalls,
  installTauriMocks,
  requestPayloadFromArguments,
} from '../tauri-mocks';

vi.mock('@/root', () => ({ AideonDesktopRoot: () => <div>Root</div> }));
const listenMock = vi.mocked(listen);

afterEach(() => {
  cleanup();
  clearTauriMocks();
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe('app screens', () => {
  it('renders the main screen in browser mode', () => {
    render(<MainScreen />);
    expect(screen.getByText('Root')).toBeInTheDocument();
  });

  it('signals frontend readiness in tauri', async () => {
    installTauriMocks();

    render(
      <FrontendReady>
        <div>ready</div>
      </FrontendReady>,
    );

    expect(screen.getByText('ready')).toBeInTheDocument();
    await waitFor(() => {
      const call = findIpcCall('system_setup_complete');
      expect(call).toBeDefined();
    });
    const call = findIpcCall('system_setup_complete');
    expect(requestPayloadFromArguments(call?.arguments_)).toEqual({ task: 'frontend' });
  });

  it('detects tauri runtime from global flags', () => {
    expect(isTauriRuntime()).toBe(false);
    (globalThis as { __TAURI__?: unknown }).__TAURI__ = {};
    expect(isTauriRuntime()).toBe(true);
  });

  it('cycles splash screen copy', () => {
    vi.useFakeTimers();
    render(<SplashScreenRoute />);

    expect(screen.getByText('Reticulating splines…')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(1600);
    });
    expect(screen.getByText('Weaving twin orbits…')).toBeInTheDocument();
  });

  it('signals frontend readiness from the splash window', async () => {
    installTauriMocks({ currentWindow: 'splash' });

    render(<SplashScreenRoute />);

    await waitFor(() => {
      const call = findIpcCall('system_setup_complete');
      expect(call).toBeDefined();
    });
    const call = findIpcCall('system_setup_complete');
    expect(requestPayloadFromArguments(call?.arguments_)).toEqual({ task: 'frontend' });
  });

  it('surfaces setup failures and opens the Status window', async () => {
    installTauriMocks({ currentWindow: 'splash' });
    const handlers = new Map<string, (event: { payload: unknown }) => void>();

    listenMock.mockImplementation((name, callback) => {
      handlers.set(name, callback as (event: { payload: unknown }) => void);
      return Promise.resolve(() => {
        handlers.delete(name);
      });
    });

    render(<SplashScreenRoute />);

    await waitFor(() => {
      expect(handlers.has('setup_failed')).toBe(true);
    });

    act(() => {
      handlers.get('setup_failed')?.({ payload: { code: 'internal', message: 'boom' } });
    });

    expect(await screen.findByText('Setup failed')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open Status' }));

    await waitFor(() => {
      const calls = getIpcCalls().filter((call) => call.command === 'system_window_open');
      expect(calls.length).toBeGreaterThan(0);
      const last = calls.at(-1);
      expect(requestPayloadFromArguments(last?.arguments_)).toEqual({ window: 'status' });
    });
  });

  it('renders status and about screens', () => {
    render(<StatusScreen />);
    expect(screen.getByText('Host status')).toBeInTheDocument();
    expect(screen.getByText('All services initialising…')).toBeInTheDocument();

    render(<AboutScreen />);
    expect(screen.getByText('Aideon')).toBeInTheDocument();
    expect(screen.getByText('Desktop shell for Praxis workspace and tools.')).toBeInTheDocument();
  });

  it('renders settings and styleguide screens', () => {
    render(
      <ColorThemeProvider>
        <SettingsScreen />
      </ColorThemeProvider>,
    );

    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Color theme')).toBeInTheDocument();
    expect(screen.getByText('Corporate Blue')).toBeInTheDocument();
    expect(screen.getByText('Default')).toBeInTheDocument();

    render(<StyleguideScreen />);
    expect(screen.getByText('Styleguide')).toBeInTheDocument();
    expect(screen.getByText('Design system documentation pending.')).toBeInTheDocument();
  });
});
