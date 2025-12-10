import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('canvas/time/use-temporal-panel', () => ({
  useTemporalPanel: vi.fn(),
}));

vi.mock('@radix-ui/react-tabs', () => {
  const React = require('react');
  const TabsContext = React.createContext<{ value?: string; onChange?: (v: string) => void }>({});
  const Root = ({ value, onValueChange, children }: any) => (
    <TabsContext.Provider value={{ value, onChange: onValueChange }}>{children}</TabsContext.Provider>
  );
  const List = ({ children, ...props }: any) => <div role="tablist" {...props}>{children}</div>;
  const Trigger = ({ value, children, ...props }: any) => {
    const ctx = React.useContext(TabsContext);
    return (
      <button role="tab" onClick={() => ctx.onChange?.(value)} {...props}>
        {children}
      </button>
    );
  };
  const Content = ({ value, children, ...props }: any) => {
    const ctx = React.useContext(TabsContext);
    if (ctx.value !== value) {
      return <div hidden {...props} />;
    }
    return (
      <div role="tabpanel" {...props}>
        {children}
      </div>
    );
  };
  return { Root, List, Trigger, Content };
});

vi.mock('canvas/components/blocks/activity-timeline-panel', () => ({
  ActivityTimelinePanel: () => <div data-testid="activity-panel">Activity</div>,
}));

vi.mock('canvas/components/blocks/commit-timeline-list', () => ({
  CommitTimelineList: () => <div data-testid="commit-list">Commits</div>,
}));

vi.mock('canvas/components/dashboard/canvas-runtime-card', () => ({
  CanvasRuntimeCard: ({ widgets }: { widgets: unknown[] }) => (
    <div data-testid="canvas-runtime">{widgets.length} widgets</div>
  ),
}));

import { useTemporalPanel } from 'canvas/time/use-temporal-panel';
import { WorkspaceTabs } from 'canvas/components/workspace-tabs';
import type { SelectionState } from 'canvas/types';

const mockUseTemporalPanel = vi.mocked(useTemporalPanel);

const baseSelection: SelectionState = { nodeIds: [], edgeIds: [] };

describe('WorkspaceTabs', () => {
  it('shows loading state when snapshot is pending', () => {
    mockUseTemporalPanel.mockReturnValue([
      { loading: true, snapshot: null, branch: null, diff: null, mergeConflicts: null },
      {},
    ] as any);

    render(
      <WorkspaceTabs
        widgets={[]}
        selection={baseSelection}
        onSelectionChange={vi.fn()}
        onRequestMetaModelFocus={vi.fn()}
      />,
    );

    expect(screen.getByText(/Loading snapshot/)).toBeInTheDocument();
  });

  it('renders overview metrics and handles tab changes', async () => {
    mockUseTemporalPanel.mockReturnValue([
      {
        loading: false,
        snapshot: { nodes: 10, edges: 5, confidence: 0.42, scenario: 'Test' },
        branch: 'dev',
        diff: { metrics: { nodeAdds: 1, nodeMods: 2, nodeDels: 0, edgeAdds: 3, edgeMods: 0, edgeDels: 1 } },
        mergeConflicts: [{ kind: 'edge', reference: 'e1', message: 'conflict' }],
      },
      { refresh: vi.fn() },
    ] as any);
    render(
      <WorkspaceTabs
        widgets={[{ id: 'w1' } as any]}
        selection={baseSelection}
        onSelectionChange={vi.fn()}
        onRequestMetaModelFocus={vi.fn()}
      />,
    );

    expect(screen.getByText('Snapshot overview')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText(/42%/)).toBeInTheDocument();
    expect(screen.getAllByText(/conflict/i).length).toBeGreaterThanOrEqual(1);

    const canvasTab = screen.getAllByRole('tab', { name: 'Canvas' })[0];
    fireEvent.click(canvasTab);

    await waitFor(() => expect(screen.getByTestId('canvas-runtime')).toBeInTheDocument());
  });
});
