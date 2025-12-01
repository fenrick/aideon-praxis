import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/workspace-tabs', () => ({
  WorkspaceTabs: () => <div>Workspace Tabs</div>,
}));

vi.mock('@/components/dashboard/activity-feed-card', () => ({
  ActivityFeedCard: () => <div>Activity Feed</div>,
}));

vi.mock('@/components/dashboard/commit-timeline-card', () => ({
  CommitTimelineCard: () => <div>Commit Timeline</div>,
}));

vi.mock('@/components/dashboard/global-search-card', () => ({
  GlobalSearchCard: () => <div>Global Search</div>,
}));

vi.mock('@/components/dashboard/meta-model-panel', () => ({
  MetaModelPanel: () => <div>Meta Model Panel</div>,
}));

vi.mock('@/components/dashboard/selection-inspector-card', () => ({
  SelectionInspectorCard: () => <div>Selection Inspector</div>,
}));

vi.mock('@/components/dashboard/time-cursor-card', () => ({
  TimeCursorCard: () => <div>Time Cursor</div>,
}));

vi.mock('@/components/dashboard/worker-health-card', () => ({
  WorkerHealthCard: () => <div>Worker Health</div>,
}));

vi.mock('@/components/dashboard/phase-checkpoints-card', () => ({
  PhaseCheckpointsCard: () => <div>Phase Checkpoints</div>,
}));

import { PraxisCanvasSurface } from './app';

describe('PraxisCanvasSurface', () => {
  it('renders canvas content without the legacy chrome', () => {
    render(<PraxisCanvasSurface />);

    expect(screen.getByText(/Active template/i)).toBeTruthy();
    expect(screen.getByText(/Save template/i)).toBeTruthy();
    expect(screen.getByText(/Workspace Tabs/i)).toBeTruthy();
  });
});
