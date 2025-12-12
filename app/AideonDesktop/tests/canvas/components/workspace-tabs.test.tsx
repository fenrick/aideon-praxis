import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('canvas/time/use-temporal-panel', () => ({
  useTemporalPanel: vi.fn(),
}));

vi.mock('@radix-ui/react-tabs', () => {
  interface TabsContextValue {
    value?: string;
    onChange?: (value: string) => void;
  }
  const TabsContext = React.createContext<TabsContextValue>({});

  const Root = ({
    value,
    onValueChange,
    children,
  }: React.PropsWithChildren<{ value?: string; onValueChange?: (value: string) => void }>) => {
    const memoValue = React.useMemo(
      () => ({ value, onChange: onValueChange }),
      [onValueChange, value],
    );
    return <TabsContext.Provider value={memoValue}>{children}</TabsContext.Provider>;
  };

  const List = ({
    children,
    ...properties
  }: React.PropsWithChildren<React.HTMLAttributes<HTMLDivElement>>) => (
    <div role="tablist" {...properties}>
      {children}
    </div>
  );

  const Trigger = ({
    value,
    children,
    ...properties
  }: React.PropsWithChildren<
    React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }
  >) => {
    const context = React.useContext(TabsContext);
    const handleClick = () => context.onChange?.(value);
    return (
      <button role="tab" onClick={handleClick} {...properties}>
        {children}
      </button>
    );
  };

  const Content = ({
    value,
    children,
    ...properties
  }: React.PropsWithChildren<{ value: string } & React.HTMLAttributes<HTMLDivElement>>) => {
    const context = React.useContext(TabsContext);
    if (context.value !== value) {
      return <div hidden {...properties} />;
    }
    return (
      <div role="tabpanel" {...properties}>
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

import { WorkspaceTabs } from 'canvas/components/workspace-tabs';
import { useTemporalPanel } from 'canvas/time/use-temporal-panel';
import type { SelectionState } from 'canvas/types';

const mockUseTemporalPanel = vi.mocked(useTemporalPanel);

const baseSelection: SelectionState = { nodeIds: [], edgeIds: [] };

describe('WorkspaceTabs', () => {
  it('shows loading state when snapshot is pending', () => {
    mockUseTemporalPanel.mockReturnValue([
      {
        loading: true,
        snapshot: undefined,
        branch: undefined,
        diff: undefined,
        mergeConflicts: undefined,
      },
      {},
    ] as unknown as [
      {
        loading: boolean;
        snapshot?: unknown;
        branch?: string;
        diff?: unknown;
        mergeConflicts?: unknown;
      },
      Record<string, unknown>,
    ]);

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
        diff: {
          metrics: { nodeAdds: 1, nodeMods: 2, nodeDels: 0, edgeAdds: 3, edgeMods: 0, edgeDels: 1 },
        },
        mergeConflicts: [{ kind: 'edge', reference: 'e1', message: 'conflict' }],
      },
      { refresh: vi.fn() },
    ] as unknown as [
      {
        loading: boolean;
        snapshot?: { nodes: number; edges: number; confidence: number; scenario: string };
        branch?: string;
        diff?: { metrics: Record<string, number> };
        mergeConflicts?: { kind: string; reference: string; message: string }[];
      },
      { refresh: () => void },
    ]);
    render(
      <WorkspaceTabs
        widgets={[{ id: 'w1' }]}
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
