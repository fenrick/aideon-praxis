import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { TemporalPanelState } from '@/time/use-temporal-panel';

const selectCommitSpy = vi.fn();
const selectBranchSpy = vi.fn();

vi.mock('@/time/use-temporal-panel', () => ({
  useTemporalPanel: () => [mockState, { selectCommit: selectCommitSpy, selectBranch: selectBranchSpy }] as const,
}));

let mockState: TemporalPanelState;

import { GlobalSearchCard } from '@/components/dashboard/global-search-card';

describe('GlobalSearchCard', () => {
  beforeEach(() => {
    selectCommitSpy.mockReset();
    selectBranchSpy.mockReset();
    mockState = {
      branches: [{ name: 'main', head: 'a1' }],
      branch: 'main',
      commits: [
        {
          id: 'commit-1',
          branch: 'main',
          parents: [],
          author: 'Chrona',
          message: 'Add catalogue widgets',
          tags: ['ui', 'catalogue'],
          changeCount: 6,
          time: '2025-11-10T10:30:00.000Z',
        },
        {
          id: 'commit-2',
          branch: 'chronaplay',
          parents: [],
          author: 'Metis',
          message: 'Scenario polish',
          tags: ['scenario'],
          changeCount: 2,
          time: '2025-11-11T12:00:00.000Z',
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

  it('filters commits by search query and triggers actions', () => {
    render(<GlobalSearchCard />);

    const [input] = screen.getAllByPlaceholderText('Search commits, branches, tags');
    fireEvent.change(input, {
      target: { value: 'catalogue' },
    });

    expect(screen.getByText('Add catalogue widgets')).toBeInTheDocument();
    const [switchBranchButton] = screen.getAllByText('Switch branch');
    fireEvent.click(switchBranchButton);
    expect(selectBranchSpy).toHaveBeenCalledWith('main');

    const [jumpButton] = screen.getAllByText('Jump to commit');
    fireEvent.click(jumpButton);
    expect(selectCommitSpy).toHaveBeenCalledWith('commit-1');
  });

  it('shows empty results message when nothing matches', () => {
    render(<GlobalSearchCard />);

    const [input] = screen.getAllByPlaceholderText('Search commits, branches, tags');
    fireEvent.change(input, {
      target: { value: 'missing' },
    });
    expect(screen.getByText('No matches found.')).toBeInTheDocument();
  });
});
