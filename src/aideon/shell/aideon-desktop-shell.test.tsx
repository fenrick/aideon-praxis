/**
 * M0 accessibility baseline for the Aideon desktop shell (ADR-0024, #368).
 *
 * Acceptance gates:
 *  1. No keyboard trap on shell launch — Tab cycles all focusable elements.
 *  2. Shell regions have discoverable accessible names.
 *  3. axe-core reports zero critical/serious violations in light and dark mode.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { run as axeRun } from 'axe-core';
import { describe, expect, it } from 'vitest';

import { AideonDesktopShell } from './aideon-desktop-shell';

// Minimal shell that places two focusable elements — one in content, one in
// inspector — so the keyboard-trap test can observe that focus cycles out of
// each region rather than looping inside it.
function ShellFixture({ theme = 'light' }: { readonly theme?: 'light' | 'dark' }) {
  return (
    <div data-theme={theme}>
      <AideonDesktopShell
        navigation={<nav aria-label="Navigation" />}
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
