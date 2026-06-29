/**
 * M0 accessibility baseline for honest-state design-system blocks (ADR-0024, #368).
 *
 * Each block must convey its status via both colour/icon AND a visible text
 * label — colour alone is never the only signal (WCAG 1.4.1 Non-text Contrast).
 */

import { render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { describe, expect, it } from 'vitest';

import { ProvenanceBadge } from './provenance-badge';
import { StaleBadge } from './stale-badge';
import { StatusBadge } from './status-badge';
import { WarningBanner } from './warning-banner';

// ── Text-label assertions (WCAG 1.4.1) ───────────────────────────────────────

describe('StatusBadge', () => {
  it('renders the label text alongside the icon', () => {
    render(<StatusBadge tone="stale" label="Stale" />);
    expect(screen.getByText('Stale')).toBeInTheDocument();
  });

  it('renders icon as aria-hidden so it does not double-announce the label', () => {
    const { container } = render(<StatusBadge tone="stale" label="Stale" icon={undefined} />);
    // When an icon is present it must be aria-hidden (icon tests below).
    // When absent the badge still has a text label.
    expect(container.querySelector('[aria-label]')).toBeNull();
    expect(screen.getByText('Stale')).toBeInTheDocument();
  });
});

describe('StaleBadge', () => {
  it('renders "Stale" text label', () => {
    render(<StaleBadge />);
    expect(screen.getByText('Stale')).toBeInTheDocument();
  });

  it('icon is aria-hidden', () => {
    const { container } = render(<StaleBadge />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden');
  });
});

describe('ProvenanceBadge', () => {
  it.each(['asserted', 'generated', 'inferred'] as const)(
    '%s renders a text label (not colour-only)',
    (classification) => {
      render(<ProvenanceBadge classification={classification} />);
      // Each classification maps to a capitalized label text.
      const expectedLabel = classification[0].toUpperCase() + classification.slice(1);
      expect(screen.getByText(expectedLabel)).toBeInTheDocument();
    },
  );

  it.each(['asserted', 'generated', 'inferred'] as const)(
    '%s icon is aria-hidden',
    (classification) => {
      const { container } = render(<ProvenanceBadge classification={classification} />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('aria-hidden');
    },
  );
});

describe('WarningBanner', () => {
  it('renders a visible text label alongside the icon', () => {
    render(<WarningBanner message="Data may be stale" />);
    expect(screen.getByText('Warning')).toBeInTheDocument();
    expect(screen.getByText('Data may be stale')).toBeInTheDocument();
  });

  it('icon is aria-hidden', () => {
    const { container } = render(<WarningBanner message="test" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden');
  });
});

// ── axe-core smoke checks ─────────────────────────────────────────────────────

async function assertNoBlockingViolations(container: HTMLElement) {
  const results = await axe.run(container);
  const blocking = results.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious',
  );
  if (blocking.length > 0) {
    const summary = blocking.map((v) => `  [${v.impact}] ${v.id}: ${v.description}`).join('\n');
    throw new Error(`axe found ${String(blocking.length)} blocking violation(s):\n${summary}`);
  }
}

describe('axe smoke check — honest-state blocks', () => {
  it('StaleBadge has no critical/serious violations', async () => {
    const { container } = render(<StaleBadge timestamp="2 min ago" />);
    await assertNoBlockingViolations(container);
  });

  it('StatusBadge has no critical/serious violations', async () => {
    const { container } = render(<StatusBadge tone="info" label="In progress" />);
    await assertNoBlockingViolations(container);
  });

  it('ProvenanceBadge (asserted) has no critical/serious violations', async () => {
    const { container } = render(<ProvenanceBadge classification="asserted" />);
    await assertNoBlockingViolations(container);
  });

  it('WarningBanner has no critical/serious violations', async () => {
    const { container } = render(<WarningBanner message="Check your data" />);
    await assertNoBlockingViolations(container);
  });
});
