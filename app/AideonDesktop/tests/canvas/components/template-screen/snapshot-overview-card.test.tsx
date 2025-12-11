import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { SnapshotOverviewCard } from 'canvas/components/template-screen/snapshot-overview-card';
import type { TemporalPanelState } from 'canvas/time/use-temporal-panel';

const baseState: TemporalPanelState = {
  branch: 'main',
  commitId: 'c1',
  loading: false,
  snapshot: {
    nodes: 1200,
    edges: 3400,
    confidence: 0.42,
    scenario: 'Scenario A',
  },
};

describe('SnapshotOverviewCard', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows snapshot metrics with formatted values', () => {
    render(<SnapshotOverviewCard state={baseState} />);

    expect(screen.getByLabelText('Nodes metric')).toHaveTextContent('1,200');
    expect(screen.getByLabelText('Edges metric')).toHaveTextContent('3,400');
    expect(screen.getByLabelText('Confidence metric')).toHaveTextContent('42%');
    expect(screen.getByLabelText('Scenario metric')).toHaveTextContent('Scenario A');
  });

  it('falls back to defaults and renders errors', () => {
    const errorState: TemporalPanelState = {
      ...baseState,
      snapshot: undefined,
      error: 'offline',
    };
    render(<SnapshotOverviewCard state={errorState} />);

    expect(screen.getAllByLabelText('Nodes metric')[0]).toHaveTextContent('—');
    expect(screen.getByText('offline')).toBeInTheDocument();
  });
});
