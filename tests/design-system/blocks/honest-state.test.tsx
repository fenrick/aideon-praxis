import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  cleanup();
});

import { ConfidenceLabel } from 'design-system/blocks/confidence-label';
import { EmptyState } from 'design-system/blocks/empty-state';
import { ErrorFrame } from 'design-system/blocks/error-frame';
import { PartialBanner } from 'design-system/blocks/partial-banner';
import { ProvenanceBadge } from 'design-system/blocks/provenance-badge';
import { RebuildingIndicator } from 'design-system/blocks/rebuilding-indicator';
import { StaleBadge } from 'design-system/blocks/stale-badge';
import { StatusBadge } from 'design-system/blocks/status-badge';
import { WarningBanner } from 'design-system/blocks/warning-banner';

describe('StatusBadge', () => {
  it('renders tone label', () => {
    render(<StatusBadge label="Error" tone="error" />);
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('renders all tones without crashing', () => {
    const tones = ['info', 'warning', 'partial', 'stale', 'error', 'success'] as const;
    for (const tone of tones) {
      const { unmount } = render(<StatusBadge label={tone} tone={tone} />);
      expect(screen.getByText(tone)).toBeInTheDocument();
      unmount();
    }
  });
});

describe('ErrorFrame', () => {
  it('renders message with role=alert', () => {
    render(<ErrorFrame message="Something went wrong" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders detail when provided', () => {
    render(<ErrorFrame detail="Check logs" message="Failure" />);
    expect(screen.getByText('Check logs')).toBeInTheDocument();
  });

  it('calls onRetry when retry button clicked', () => {
    const onRetry = vi.fn();
    render(<ErrorFrame message="Failure" onRetry={onRetry} />);
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('omits retry button when onRetry not provided', () => {
    render(<ErrorFrame message="Failure" />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('StaleBadge', () => {
  it('renders Stale label', () => {
    render(<StaleBadge />);
    expect(screen.getByText('Stale')).toBeInTheDocument();
  });

  it('renders timestamp when provided', () => {
    render(<StaleBadge timestamp="2h ago" />);
    expect(screen.getByText('2h ago')).toBeInTheDocument();
  });
});

describe('PartialBanner', () => {
  it('renders message with role=status', () => {
    render(<PartialBanner message="Only 50 of 200 results shown" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Only 50 of 200 results shown')).toBeInTheDocument();
  });

  it('renders Partial result heading', () => {
    render(<PartialBanner message="Truncated" />);
    expect(screen.getByText('Partial result')).toBeInTheDocument();
  });
});

describe('WarningBanner', () => {
  it('renders message with role=status', () => {
    render(<WarningBanner message="Data may be incomplete" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Data may be incomplete')).toBeInTheDocument();
  });

  it('renders detail when provided', () => {
    render(<WarningBanner detail="Contact support" message="Warning" />);
    expect(screen.getByText('Contact support')).toBeInTheDocument();
  });
});

describe('RebuildingIndicator', () => {
  it('renders with default label', () => {
    render(<RebuildingIndicator />);
    expect(screen.getByText('Rebuilding…')).toBeInTheDocument();
  });

  it('renders with custom label', () => {
    render(<RebuildingIndicator label="Indexing…" />);
    expect(screen.getByText('Indexing…')).toBeInTheDocument();
  });

  it('has role=status for live region', () => {
    render(<RebuildingIndicator />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});

describe('ProvenanceBadge', () => {
  it('renders Asserted label', () => {
    render(<ProvenanceBadge classification="asserted" />);
    expect(screen.getByText('Asserted')).toBeInTheDocument();
  });

  it('renders Inferred label', () => {
    render(<ProvenanceBadge classification="inferred" />);
    expect(screen.getByText('Inferred')).toBeInTheDocument();
  });

  it('renders Generated label', () => {
    render(<ProvenanceBadge classification="generated" />);
    expect(screen.getByText('Generated')).toBeInTheDocument();
  });
});

describe('ConfidenceLabel', () => {
  it('renders High tier', () => {
    render(<ConfidenceLabel tier="high" />);
    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('renders all tiers without crashing', () => {
    const tiers = ['high', 'medium', 'low', 'indicative'] as const;
    for (const tier of tiers) {
      const { unmount } = render(<ConfidenceLabel tier={tier} />);
      unmount();
    }
  });

  it('exposes aria-label with fuller description for indicative tier', () => {
    render(<ConfidenceLabel tier="indicative" />);
    const el = screen.getByText('Indicative');
    expect(el).toHaveAttribute('aria-label', expect.stringContaining('directional'));
  });
});

describe('EmptyState', () => {
  it('renders title', () => {
    render(<EmptyState title="No results" />);
    expect(screen.getByText('No results')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<EmptyState description="Try adjusting filters" title="No results" />);
    expect(screen.getByText('Try adjusting filters')).toBeInTheDocument();
  });

  it('renders action slot', () => {
    render(
      <EmptyState action={<button type="button">Add item</button>} title="No results" />,
    );
    expect(screen.getByRole('button', { name: 'Add item' })).toBeInTheDocument();
  });
});
