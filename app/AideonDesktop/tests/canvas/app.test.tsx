import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest';

vi.mock('canvas/components/app-sidebar', () => ({
  AppSidebar: ({ scenarios, loading }: { scenarios: unknown[]; loading: boolean }) => (
    <div data-testid="sidebar">{loading ? 'loading' : `scenarios:${scenarios.length}`}</div>
  ),
}));

vi.mock('canvas/components/dashboard/activity-feed-card', () => ({
  ActivityFeedCard: () => <div data-testid="activity" />,
}));

vi.mock('canvas/components/dashboard/commit-timeline-card', () => ({
  CommitTimelineCard: () => <div data-testid="timeline" />,
}));

vi.mock('canvas/components/dashboard/global-search-card', () => ({
  GlobalSearchCard: ({
    onSelectNodes,
    onFocusMetaModel,
    onShowTimeline,
  }: {
    onSelectNodes: (ids: string[]) => void;
    onFocusMetaModel: (entry: { id: string }) => void;
    onShowTimeline: () => void;
  }) => (
    <div>
      <button onClick={() => onSelectNodes(['node-42'])}>select-node</button>
      <button onClick={() => onFocusMetaModel({ id: 'meta-1' })}>focus-meta</button>
      <button onClick={onShowTimeline}>open-timeline</button>
    </div>
  ),
}));

vi.mock('canvas/components/dashboard/meta-model-panel', () => ({
  MetaModelPanel: ({ focusEntryId }: { focusEntryId?: string }) => (
    <div data-testid="meta-model">{focusEntryId ?? 'none'}</div>
  ),
}));

vi.mock('canvas/components/dashboard/phase-checkpoints-card', () => ({
  PhaseCheckpointsCard: () => <div data-testid="phase-checkpoints" />,
}));

vi.mock('canvas/components/dashboard/selection-inspector-card', () => ({
  SelectionInspectorCard: () => <div data-testid="selection-inspector" />,
}));

vi.mock('canvas/components/dashboard/time-cursor-card', () => ({
  TimeCursorCard: () => <div data-testid="time-cursor" />,
}));

vi.mock('canvas/components/dashboard/worker-health-card', () => ({
  WorkerHealthCard: () => <div data-testid="worker-health" />,
}));

vi.mock('canvas/components/shell/search-bar', () => ({
  SearchBar: () => <div data-testid="search-bar" />,
}));

vi.mock('canvas/components/workspace-tabs', () => ({
  WorkspaceTabs: ({
    selection,
    onSelectionChange,
    onRequestMetaModelFocus,
    value,
    onValueChange,
  }: {
    selection: { nodeIds: string[]; edgeIds: string[] };
    onSelectionChange: (next: { nodeIds: string[]; edgeIds: string[]; sourceWidgetId?: string }) => void;
    onRequestMetaModelFocus: (types: string[]) => void;
    value: string;
    onValueChange: (next: string) => void;
  }) => (
    <div>
      <div data-testid="workspace-tab">{value}</div>
      <button onClick={() => onSelectionChange({ ...selection, nodeIds: ['n1'] })}>
        change-selection
      </button>
      <button onClick={() => onRequestMetaModelFocus(['model-a'])}>focus-meta</button>
      <button onClick={() => onValueChange(value === 'overview' ? 'canvas' : 'overview')}>
        toggle-tab
      </button>
    </div>
  ),
}));

vi.mock('canvas/praxis-api', () => ({
  listScenarios: vi.fn(),
}));

vi.mock('canvas/platform', () => ({ isTauri: vi.fn() }));
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));

import { invoke } from '@tauri-apps/api/core';
import { listScenarios } from 'canvas/praxis-api';
import { isTauri } from 'canvas/platform';
import { searchStore } from 'canvas/lib/search';

import App, { LegacyPraxisCanvasApp, PraxisCanvasSurface } from 'canvas/app';

const listScenariosMock = vi.mocked(listScenarios);
const isTauriMock = vi.mocked(isTauri);
const invokeMock = vi.mocked(invoke);

describe('Praxis canvas app shell', () => {
  beforeEach(() => {
    listScenariosMock.mockResolvedValue([
      {
        id: 'mainline',
        name: 'Mainline FY25',
        branch: 'main',
        updatedAt: '2025-01-01T00:00:00Z',
        isDefault: true,
      },
    ]);
    isTauriMock.mockReturnValue(false);
    invokeMock.mockReset();
    searchStore.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows unsupported page outside /canvas route', () => {
    window.history.pushState({}, '', '/not-canvas');

    render(<LegacyPraxisCanvasApp />);

    expect(screen.getByText(/Unsupported path/i)).toBeInTheDocument();
    expect(screen.getByText(/not-canvas/)).toBeInTheDocument();
  });

  it('renders canvas experience on /canvas and fetches scenarios', async () => {
    window.history.pushState({}, '', '/canvas');

    render(<App />);

    await waitFor(() => expect(listScenariosMock).toHaveBeenCalled());
    expect(screen.getByTestId('sidebar').textContent).toContain('scenarios:1');
    expect(screen.getByText(/Active template/i)).toBeInTheDocument();
  });

  it('fires selection change callback from the surface', async () => {
    window.history.pushState({}, '', '/canvas');
    const onSelectionChange = vi.fn();

    render(<PraxisCanvasSurface onSelectionChange={onSelectionChange} />);

    await waitFor(() => expect(listScenariosMock).toHaveBeenCalled());
    fireEvent.click(screen.getAllByText('select-node')[0]);

    await waitFor(() => expect(onSelectionChange).toHaveBeenCalled());
  });

  it('saves a new template when prompted and updates the select list', async () => {
    window.history.pushState({}, '', '/canvas');
    const promptSpy = vi.spyOn(globalThis, 'prompt').mockReturnValue('My Saved Template');

    render(<App />);

    await waitFor(() => expect(listScenariosMock).toHaveBeenCalled());
    fireEvent.click(screen.getAllByText('Save template')[0]);

    expect(promptSpy).toHaveBeenCalled();
    expect(screen.getByDisplayValue(/My Saved Template/)).toBeInTheDocument();
  });

  it('invokes host windows when sidebar actions are selected inside Tauri', async () => {
    window.history.pushState({}, '', '/canvas');
    isTauriMock.mockReturnValue(true);
    invokeMock.mockResolvedValue(undefined);

    render(<App />);

    await waitFor(() => expect(searchStore.getState().items.length).toBeGreaterThan(0));
    const statusEntry = searchStore.getState().items.find((item) => item.id === 'sidebar:status');
    expect(statusEntry?.run).toBeDefined();
    statusEntry?.run?.();

    await waitFor(() => expect(invokeMock).toHaveBeenCalledWith('open_status'));
  });
});
