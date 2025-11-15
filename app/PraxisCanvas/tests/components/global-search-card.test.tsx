import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { TemporalPanelState } from '@/time/use-temporal-panel';

const selectCommitSpy = vi.fn();
const selectBranchSpy = vi.fn();
const refreshBranchesSpy = vi.fn();

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverMock);
});

afterAll(() => {
  vi.unstubAllGlobals();
});

vi.mock('@/time/use-temporal-panel', () => ({
  useTemporalPanel: () =>
    [
      mockState,
      {
        selectCommit: selectCommitSpy,
        selectBranch: selectBranchSpy,
        refreshBranches: refreshBranchesSpy,
      },
    ] as const,
}));

let mockState: TemporalPanelState;

import { GlobalSearchCard } from '@/components/dashboard/global-search-card';

describe('GlobalSearchCard', () => {
  beforeEach(() => {
    selectCommitSpy.mockReset();
    selectBranchSpy.mockReset();
    refreshBranchesSpy.mockReset();
    mockState = {
      branches: [
        { name: 'main', head: 'a1' },
        { name: 'chronaplay', head: 'b2' },
      ],
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

  it('shows recent commits preview actions', () => {
    render(<GlobalSearchCard />);

    const [switchBranchButton] = screen.getAllByText('Switch branch');
    fireEvent.click(switchBranchButton);
    expect(selectBranchSpy).toHaveBeenCalledWith('chronaplay');

    const [jumpButton] = screen.getAllByText('Jump to commit');
    fireEvent.click(jumpButton);
    expect(selectCommitSpy).toHaveBeenCalledWith('commit-2');
  });

  it('uses the command palette to trigger actions', () => {
    render(<GlobalSearchCard />);

    const [openButton] = screen.getAllByRole('button', { name: /Open command palette/i });
    fireEvent.click(openButton);
    fireEvent.click(screen.getByText('chronaplay'));
    expect(selectBranchSpy).toHaveBeenCalledWith('chronaplay');

    fireEvent.click(openButton);
    const input = screen.getByPlaceholderText('Search branches, commits, tags');
    fireEvent.input(input, { target: { value: 'catalogue' } });
    fireEvent.click(screen.getByText('Add catalogue widgets'));
    expect(selectCommitSpy).toHaveBeenCalledWith('commit-1');

    fireEvent.click(openButton);
    fireEvent.click(screen.getByText('Refresh branches'));
    expect(refreshBranchesSpy).toHaveBeenCalled();
  });
});
