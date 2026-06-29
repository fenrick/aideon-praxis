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
import axe from 'axe-core';
import { describe, expect, it } from 'vitest';

import { AideonDesktopShell } from './aideon-desktop-shell';

// Minimal shell that places two focusable elements — one in content, one in
// inspector — so the keyboard-trap test can observe that focus cycles out of
// each region rather than looping inside it.
function ShellFixture({ theme = 'light' }: { theme?: 'light' | 'dark' }) {
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
    // Must have an aria-label so a screen reader can announce "Main content region"
    // (or similar) when the user navigates to it.
    expect(region).toHaveAttribute('aria-label');
    expect(region.getAttribute('aria-label')!.length).toBeGreaterThan(0);
  });

  it('aideon-shell-inspector has a discoverable accessible name', () => {
    render(<ShellFixture />);
    const region = screen.getByTestId('aideon-shell-inspector');
    expect(region).toHaveAttribute('aria-label');
    expect(region.getAttribute('aria-label')!.length).toBeGreaterThan(0);
  });

  // ── Keyboard trap ─────────────────────────────────────────────────────────

  it('Tab from content-area element reaches inspector element without trapping', async () => {
    const user = userEvent.setup();
    render(<ShellFixture />);

    const contentLink = screen.getByTestId('content-link');
    const inspectorBtn = screen.getByTestId('inspector-btn');

    // Focus the content-area link and tab through the page.
    contentLink.focus();
    expect(document.activeElement).toBe(contentLink);

    // Tab repeatedly until we hit the inspector button or exhaust a reasonable
    // number of presses — no tab count should loop back to the content link
    // before touching the inspector button (that would indicate a focus trap).
    const MAX_TABS = 20;
    let reached = false;
    for (let i = 0; i < MAX_TABS; i++) {
      await user.tab();
      if (document.activeElement === inspectorBtn) {
        reached = true;
        break;
      }
      // If focus returns to the start before reaching the inspector that's a trap.
      expect(document.activeElement).not.toBe(contentLink);
    }
    expect(reached).toBe(true);
  });

  // ── axe-core smoke check ──────────────────────────────────────────────────

  it('has zero critical or serious axe violations in light mode', async () => {
    const { container } = render(<ShellFixture theme="light" />);
    const results = await axe.run(container);
    const blocking = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );
    if (blocking.length > 0) {
      const summary = blocking.map((v) => `  [${v.impact}] ${v.id}: ${v.description}`).join('\n');
      throw new Error(`axe found ${String(blocking.length)} blocking violation(s):\n${summary}`);
    }
    expect(blocking).toHaveLength(0);
  });

  it('has zero critical or serious axe violations in dark mode', async () => {
    const { container } = render(<ShellFixture theme="dark" />);
    const results = await axe.run(container);
    const blocking = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );
    if (blocking.length > 0) {
      const summary = blocking.map((v) => `  [${v.impact}] ${v.id}: ${v.description}`).join('\n');
      throw new Error(`axe found ${String(blocking.length)} blocking violation(s):\n${summary}`);
    }
    expect(blocking).toHaveLength(0);
  });
});
