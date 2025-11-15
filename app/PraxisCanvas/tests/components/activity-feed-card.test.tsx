import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { TemporalPanelState } from '@/time/use-temporal-panel';

const selectCommitSpy = vi.fn();
const refreshBranchesSpy = vi.fn();

vi.mock('@/time/use-temporal-panel', () => ({
  useTemporalPanel: () =>
    [
      mockState,
      { selectCommit: selectCommitSpy, refreshBranches: refreshBranchesSpy },
    ] as const,
}));

let mockState: TemporalPanelState;

import { ActivityFeedCard } from '@/components/dashboard/activity-feed-card';

describe('ActivityFeedCard', () => {
  beforeEach(() => {
    selectCommitSpy.mockReset();
    refreshBranchesSpy.mockReset();
    mockState = {
      branches: [{ name: 'main', head: 'a1' }],
      branch: 'main',
      commits: [
        {
          id: 'commit-1',
          branch: 'main',
          parents: [],
          author: 'Chrona',
          message: 'Add widgets',
          tags: ['ui'],
          changeCount: 3,
          time: '2025-11-10T10:30:00.000Z',
        },
      ],
      commitId: undefined,
      snapshot: undefined,
      loading: false,
      snapshotLoading: false,
      error: undefined,
      mergeConflicts: undefined,
      merging: false,
    } satisfies TemporalPanelState;
  });

  it('renders commit metadata and tags', () => {
    render(<ActivityFeedCard />);

    expect(screen.getByText('Add widgets')).toBeInTheDocument();
    fireEvent.click(screen.getByText('View'));
    expect(selectCommitSpy).toHaveBeenCalledWith('commit-1');
  });

  it('shows empty state when no commits exist', () => {
    mockState = { ...mockState, commits: [] };
    render(<ActivityFeedCard />);
    expect(screen.getByText('No commits recorded yet for this branch.')).toBeInTheDocument();
  });

  it('handles refresh control', () => {
    render(<ActivityFeedCard />);
    const [refreshButton] = screen.getAllByText('Refresh timeline');
    fireEvent.click(refreshButton);
    expect(refreshBranchesSpy).toHaveBeenCalled();
  });
});
