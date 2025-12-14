import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('canvas/components/dashboard/canvas-runtime-card', () => ({
  CanvasRuntimeCard: () => <div>Canvas runtime</div>,
}));

import type { TemporalPanelActions, TemporalPanelState } from 'canvas/time/use-temporal-panel';

import { OverviewTabs } from 'canvas/components/template-screen/overview-tabs';

const temporalState: TemporalPanelState = {
  branches: [{ name: 'main', head: 'c2' }],
  branch: 'main',
  commits: [
    { id: 'c1', branch: 'main', parents: [], message: 'Init', tags: [], changeCount: 1 },
    { id: 'c2', branch: 'main', parents: ['c1'], message: 'Add flow', tags: [], changeCount: 2 },
  ],
  commitId: 'c2',
  snapshot: { nodes: 10, edges: 4, scenario: 'main' },
  loading: false,
  snapshotLoading: false,
  error: undefined,
  mergeConflicts: undefined,
  merging: false,
} as TemporalPanelState;

const temporalActions: TemporalPanelActions = {
  selectBranch: vi.fn().mockResolvedValue(),
  selectCommit: vi.fn().mockResolvedValue(),
  refreshBranches: vi.fn().mockResolvedValue(),
  mergeIntoMain: vi.fn().mockResolvedValue(),
};

describe('OverviewTabs', () => {
  it('renders tabs and switches to Activity', () => {
    render(
      <OverviewTabs
        state={temporalState}
        actions={temporalActions}
        widgets={[]}
        selection={{ nodeIds: [], edgeIds: [], sourceWidgetId: undefined }}
        onSelectionChange={vi.fn()}
        onRequestMetaModelFocus={vi.fn()}
        initialTab="activity"
        activityContent={<div>Activity content</div>}
        timelineContent={<div>Timeline content</div>}
      />,
    );

    expect(screen.getByRole('tab', { name: /overview/i })).toBeInTheDocument();
    expect(screen.getByText(/activity content/i)).toBeInTheDocument();
  });
});
