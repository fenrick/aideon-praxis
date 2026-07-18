/**
 * M0 accessibility baseline plus the resizable inspector split for the Aideon
 * desktop shell (ADR-0024 #368, ADR-0026 UI-state persistence).
 *
 * Acceptance gates:
 *  1. No keyboard trap on shell launch — Tab cycles all focusable elements.
 *  2. Shell regions have discoverable accessible names.
 *  3. axe-core reports zero critical/serious violations in light and dark mode.
 *  4. Content and inspector regions render; ⌘I / toggleInspector collapses and
 *     restores the inspector; the drag split persists to localStorage.
 *
 * The `ResizableShell` design-system block is mocked here so the shell's own
 * wiring (accessible names, collapse/restore, size persistence) is validated
 * deterministically. The real block relies on measured layout that jsdom does
 * not provide — it is exercised end-to-end by the Playwright visual-mock.
 */

import type { ResizableShellProperties } from 'design-system';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { run as axeRun } from 'axe-core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AideonDesktopShell } from './aideon-desktop-shell';
import { useAideonShellControls } from './shell-controls';

vi.mock('design-system', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  /**
   * Stand-in for the resizable block: renders both slots inline, surfaces the
   * `defaultSizes` it was given, and exposes a button that fires `onLayout` so
   * the persistence path can be driven without real layout measurement.
   * @param root0 - Block properties.
   * @param root0.contentSlot - Primary content region.
   * @param root0.inspectorSlot - Secondary inspector region.
   * @param root0.defaultSizes - Initial split the shell mounts with.
   * @param root0.onLayout - Persistence callback.
   */
  function MockResizableShell({
    contentSlot,
    inspectorSlot,
    defaultSizes,
    onLayout,
  }: ResizableShellProperties) {
    return (
      <div data-testid="mock-resizable-shell">
        <span data-testid="mock-default-sizes">{JSON.stringify(defaultSizes)}</span>
        <button
          data-testid="mock-trigger-layout"
          type="button"
          onClick={() => {
            onLayout?.([70, 30]);
          }}
        >
          Resize
        </button>
        {contentSlot}
        {inspectorSlot}
      </div>
    );
  }
  return { ...actual, ResizableShell: MockResizableShell };
});

const INSPECTOR_COLLAPSED_STORAGE_KEY = 'aideon-shell-inspector-collapsed';
const PANEL_SIZES_STORAGE_KEY = 'aideon-shell-panel-sizes';

// In-memory localStorage stand-in so the shell's persistence paths exercise a
// real store. The jsdom environment runs with an opaque origin, so the built-in
// `localStorage` is otherwise unavailable and the shell falls back to a no-op.
const storageBacking = new Map<string, string>();
const localStorageMock = {
  getItem(key: string) {
    return storageBacking.get(key) ?? undefined;
  },
  setItem(key: string, value: string) {
    storageBacking.set(key, value);
  },
  removeItem(key: string) {
    storageBacking.delete(key);
  },
  clear() {
    storageBacking.clear();
  },
};

/**
 * A navigation-slot control that reaches the shell controls context to drive
 * the inspector toggle exactly as the toolbar and ⌘I command do.
 */
function InspectorToggle() {
  const controls = useAideonShellControls();
  return (
    <button
      data-testid="inspector-toggle"
      type="button"
      onClick={() => {
        controls?.toggleInspector();
      }}
    >
      Toggle inspector
    </button>
  );
}

/**
 * Minimal shell that places two focusable elements — one in content, one in
 * inspector — so the keyboard-trap test can observe that focus cycles out of
 * each region rather than looping inside it.
 * @param root0 - Fixture props.
 * @param root0.theme - Colour theme applied to the wrapping element.
 */
function ShellFixture({ theme = 'light' }: { readonly theme?: 'light' | 'dark' }) {
  return (
    <div data-theme={theme}>
      <AideonDesktopShell
        navigation={
          <nav aria-label="Navigation">
            <InspectorToggle />
          </nav>
        }
        content={
          <div>
            <a href="#content-link" data-testid="content-link">
              Content link
            </a>
          </div>
        }
        inspector={
          <div>
            <button data-testid="inspector-btn" type="button">
              Inspector action
            </button>
          </div>
        }
      />
    </div>
  );
}

beforeEach(() => {
  storageBacking.clear();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    writable: true,
    value: localStorageMock,
  });
});

describe('AideonDesktopShell accessibility baseline (ADR-0024)', () => {
  // ── Region accessible names ───────────────────────────────────────────────

  it('aideon-shell-content has a discoverable accessible name', () => {
    render(<ShellFixture />);
    const region = screen.getByTestId('aideon-shell-content');
    expect(region).toHaveAttribute('aria-label');
    expect(region.getAttribute('aria-label')?.length).toBeGreaterThan(0);
  });

  it('aideon-shell-inspector has a discoverable accessible name', () => {
    render(<ShellFixture />);
    const region = screen.getByTestId('aideon-shell-inspector');
    expect(region).toHaveAttribute('aria-label');
    expect(region.getAttribute('aria-label')?.length).toBeGreaterThan(0);
  });

  // ── Keyboard trap ─────────────────────────────────────────────────────────

  it('Tab from content-area element reaches inspector element without trapping', async () => {
    const user = userEvent.setup();
    render(<ShellFixture />);

    const contentLink = screen.getByTestId('content-link');
    const inspectorButton = screen.getByTestId('inspector-btn');

    contentLink.focus();
    expect(contentLink).toHaveFocus();

    // Tab until we reach the inspector button or exhaust a bound.
    // If focus returns to contentLink before reaching the inspector, that is a trap.
    const MAX_TABS = 20;
    let reached = false;
    for (let index = 0; index < MAX_TABS; index++) {
      await user.tab();
      if (document.activeElement === inspectorButton) {
        reached = true;
        break;
      }
      expect(contentLink).not.toHaveFocus();
    }
    expect(reached).toBe(true);
  });

  // ── axe-core smoke check ──────────────────────────────────────────────────

  it('has zero critical or serious axe violations in light mode', async () => {
    const { container } = render(<ShellFixture theme="light" />);
    const results = await axeRun(container);
    const blocking = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );
    expect(
      blocking,
      blocking.map((v) => `${v.impact ?? 'unknown'}: ${v.id}`).join(', '),
    ).toHaveLength(0);
  });

  it('has zero critical or serious axe violations in dark mode', async () => {
    const { container } = render(<ShellFixture theme="dark" />);
    const results = await axeRun(container);
    const blocking = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );
    expect(
      blocking,
      blocking.map((v) => `${v.impact ?? 'unknown'}: ${v.id}`).join(', '),
    ).toHaveLength(0);
  });
});

describe('AideonDesktopShell resizable inspector (ADR-0026)', () => {
  it('renders the content region', () => {
    render(<ShellFixture />);
    expect(screen.getByTestId('aideon-shell-content')).toBeInTheDocument();
    expect(screen.getByTestId('content-link')).toBeInTheDocument();
  });

  it('renders the inspector region by default', () => {
    render(<ShellFixture />);
    expect(screen.getByTestId('aideon-shell-inspector')).toBeInTheDocument();
    expect(screen.getByTestId('inspector-btn')).toBeInTheDocument();
  });

  it('mounts the split at the content-dominant default when nothing is persisted', () => {
    render(<ShellFixture />);
    expect(screen.getByTestId('mock-default-sizes')).toHaveTextContent('[65,35]');
  });

  it('restores the persisted split on mount', () => {
    localStorage.setItem(PANEL_SIZES_STORAGE_KEY, JSON.stringify([55, 45]));
    render(<ShellFixture />);
    expect(screen.getByTestId('mock-default-sizes')).toHaveTextContent('[55,45]');
  });

  it('persists the panel split to localStorage on layout', async () => {
    const user = userEvent.setup();
    render(<ShellFixture />);

    await user.click(screen.getByTestId('mock-trigger-layout'));

    expect(localStorage.getItem(PANEL_SIZES_STORAGE_KEY)).toBe(JSON.stringify([70, 30]));
  });

  it('collapses and restores the inspector via toggleInspector', async () => {
    const user = userEvent.setup();
    render(<ShellFixture />);

    expect(screen.getByTestId('aideon-shell-inspector')).toBeInTheDocument();

    await user.click(screen.getByTestId('inspector-toggle'));

    expect(screen.queryByTestId('aideon-shell-inspector')).not.toBeInTheDocument();
    // The content surface stays mounted while the inspector is collapsed.
    expect(screen.getByTestId('aideon-shell-content')).toBeInTheDocument();
    expect(localStorage.getItem(INSPECTOR_COLLAPSED_STORAGE_KEY)).toBe('1');

    await user.click(screen.getByTestId('inspector-toggle'));

    expect(screen.getByTestId('aideon-shell-inspector')).toBeInTheDocument();
    expect(localStorage.getItem(INSPECTOR_COLLAPSED_STORAGE_KEY)).toBe('0');
  });

  it('restores the last-dragged split after a collapse/expand cycle', async () => {
    const user = userEvent.setup();
    render(<ShellFixture />);

    await user.click(screen.getByTestId('mock-trigger-layout'));
    await user.click(screen.getByTestId('inspector-toggle'));
    await user.click(screen.getByTestId('inspector-toggle'));

    expect(screen.getByTestId('mock-default-sizes')).toHaveTextContent('[70,30]');
  });

  it('starts collapsed when persisted state says so', () => {
    localStorage.setItem(INSPECTOR_COLLAPSED_STORAGE_KEY, '1');
    render(<ShellFixture />);
    expect(screen.queryByTestId('aideon-shell-inspector')).not.toBeInTheDocument();
    expect(screen.getByTestId('aideon-shell-content')).toBeInTheDocument();
  });
});
