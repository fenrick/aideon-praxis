import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchMetaModel } lib/meta-model';
import { getCatalogueView } praxis-api';
import type { TemporalPanelState } time/use-temporal-panel';

const selectCommitSpy = vi.fn();
const selectBranchSpy = vi.fn();
const refreshBranchesSpy = vi.fn();
const selectNodesSpy = vi.fn();
const focusMetaModelSpy = vi.fn();
const scrollIntoViewMock = vi.fn();

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverMock);
  Element.prototype.scrollIntoView = scrollIntoViewMock;
});

afterAll(() => {
  vi.unstubAllGlobals();
  delete Element.prototype.scrollIntoView;
});

vi.mock('/time/use-temporal-panel', () => ({
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

vi.mock('/lib/meta-model', () => ({
  fetchMetaModel: vi.fn(),
}));

const fetchMetaModelMock = vi.mocked(fetchMetaModel);

vi.mock('/praxis-api', async () => {
  const actual = await vi.importActual<typeof import('/praxis-api')>('/praxis-api');
  return {
    ...actual,
    getCatalogueView: vi.fn(),
  };
});

const getCatalogueViewMock = vi.mocked(getCatalogueView);

let mockState: TemporalPanelState;

import { GlobalSearchCard } components/dashboard/global-search-card';

describe('GlobalSearchCard', () => {
  beforeEach(() => {
    selectCommitSpy.mockReset();
    selectBranchSpy.mockReset();
    refreshBranchesSpy.mockReset();
    selectNodesSpy.mockReset();
    focusMetaModelSpy.mockReset();
    scrollIntoViewMock.mockReset();
    fetchMetaModelMock.mockResolvedValue({
      version: 'test',
      description: 'Test schema',
      types: [{ id: 'Capability', label: 'Business Capability', category: 'Business' }],
      relationships: [
        { id: 'supports', label: 'Supports', from: ['Application'], to: ['Capability'] },
      ],
    });
    getCatalogueViewMock.mockResolvedValue({
      metadata: {
        id: 'cmd',
        name: 'Command palette quick search',
        asOf: new Date().toISOString(),
        fetchedAt: new Date().toISOString(),
        source: 'mock',
      },
      columns: [
        { id: 'name', label: 'Name', type: 'string' },
        { id: 'owner', label: 'Owner', type: 'string' },
        { id: 'state', label: 'State', type: 'string' },
      ],
      rows: [
        {
          id: 'cap-onboarding',
          values: { name: 'Customer Onboarding', owner: 'CX', state: 'Pilot' },
        },
      ],
    });
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

  it('shows recent commits preview actions', async () => {
    render(
      <GlobalSearchCard onSelectNodes={selectNodesSpy} onFocusMetaModel={focusMetaModelSpy} />,
    );

    const [switchBranchButton] = screen.getAllByText('Switch branch');
    fireEvent.click(switchBranchButton);
    expect(selectBranchSpy).toHaveBeenCalledWith('chronaplay');

    const [jumpButton] = screen.getAllByText('Jump to commit');
    fireEvent.click(jumpButton);
    expect(selectCommitSpy).toHaveBeenCalledWith('commit-2');

    await waitFor(() => {
      expect(getCatalogueViewMock).toHaveBeenCalled();
    });
  });

  it('uses the command palette to trigger actions', async () => {
    render(
      <GlobalSearchCard onSelectNodes={selectNodesSpy} onFocusMetaModel={focusMetaModelSpy} />,
    );

    const [openButton] = screen.getAllByRole('button', { name: /Open command palette/i });
    fireEvent.click(openButton);
    await waitFor(() => {
      expect(screen.getByText('chronaplay')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('chronaplay'));
    expect(selectBranchSpy).toHaveBeenCalledWith('chronaplay');

    fireEvent.click(openButton);
    const catalogueEntry = await screen.findByText('Customer Onboarding');
    fireEvent.click(catalogueEntry);
    expect(screen.getByText('Last command · Catalogue · Customer Onboarding')).toBeInTheDocument();
    expect(selectNodesSpy).toHaveBeenCalledWith(['cap-onboarding']);

    fireEvent.click(openButton);
    const metaEntry = await screen.findByText('Business Capability');
    fireEvent.click(metaEntry);
    expect(screen.getByText('Last command · Meta-model · Business Capability')).toBeInTheDocument();
    expect(focusMetaModelSpy).toHaveBeenCalledWith({
      id: 'Capability',
      label: 'Business Capability',
      category: 'Business',
      kind: 'type',
    });

    fireEvent.click(openButton);
    fireEvent.click(screen.getByText('Refresh branches'));
    expect(refreshBranchesSpy).toHaveBeenCalled();
  });
});
