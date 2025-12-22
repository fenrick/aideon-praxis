import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { SelectionState } from 'aideon/canvas/types';
import { PraxisCanvasWorkspace } from 'praxis/components/canvas/praxis-canvas-workspace';
import type { GraphViewModel } from 'praxis/praxis-api';
import type { PraxisCanvasWidget } from 'praxis/types';

/**
 * Minimal canvas runtime stand-in so we can exercise the Praxis workspace wrapper logic.
 * @param root0
 * @param root0.widgets
 * @param root0.showPageBreaks
 * @param root0.renderWidget
 */
function CanvasRuntimeMock<TWidget extends { id: string }>({
  widgets,
  showPageBreaks,
  renderWidget,
}: {
  readonly widgets: readonly TWidget[];
  readonly showPageBreaks?: boolean;
  readonly renderWidget: (widget: TWidget) => ReactNode;
}): ReactElement {
  return (
    <div data-testid="canvas-runtime" data-pages={String(showPageBreaks)}>
      {widgets.map((widget) => (
        <div key={widget.id}>{renderWidget(widget)}</div>
      ))}
    </div>
  );
}

vi.mock('aideon/canvas/canvas-runtime', () => ({
  AideonCanvasRuntime: CanvasRuntimeMock,
}));

vi.mock('praxis/widgets/graph-widget', () => ({
  GraphWidget: ({
    reloadVersion,
    onViewChange,
    onError,
  }: {
    readonly reloadVersion: number;
    readonly onViewChange: (view: GraphViewModel) => void;
    readonly onError: (message: string) => void;
  }) => (
    <div>
      <div>graph reload:{reloadVersion}</div>
      <button
        type="button"
        onClick={() => {
          onViewChange({
            metadata: { asOf: '2025-01-01T00:00:00Z' },
            stats: { nodes: 1, edges: 2 },
          } as unknown as GraphViewModel);
        }}
      >
        emit-view
      </button>
      <button
        type="button"
        onClick={() => {
          onError('boom');
        }}
      >
        emit-error
      </button>
    </div>
  ),
}));

vi.mock('praxis/widgets/catalogue-widget', () => ({
  CatalogueWidget: () => <div>catalogue</div>,
}));

vi.mock('praxis/widgets/chart-widget', () => ({
  ChartWidget: () => <div>chart</div>,
}));

vi.mock('praxis/widgets/matrix-widget', () => ({
  MatrixWidget: () => <div>matrix</div>,
}));

describe('PraxisCanvasWorkspace', () => {
  it('renders widgets, toggles page breaks, and shows view/error state', () => {
    const selection: SelectionState = { nodeIds: [], edgeIds: [] };
    const widgets: PraxisCanvasWidget[] = [
      { id: 'g1', kind: 'graph', title: 'Graph', view: {} } as unknown as PraxisCanvasWidget,
      {
        id: 'c1',
        kind: 'catalogue',
        title: 'Catalogue',
        view: {},
      } as unknown as PraxisCanvasWidget,
      { id: 'h1', kind: 'chart', title: 'Chart', view: {} } as unknown as PraxisCanvasWidget,
      { id: 'm1', kind: 'matrix', title: 'Matrix', view: {} } as unknown as PraxisCanvasWidget,
    ];

    render(<PraxisCanvasWorkspace widgets={widgets} selection={selection} />);

    expect(screen.getByText('graph reload:0')).toBeInTheDocument();
    expect(screen.getByText('catalogue')).toBeInTheDocument();
    expect(screen.getByText('chart')).toBeInTheDocument();
    expect(screen.getByText('matrix')).toBeInTheDocument();

    expect(screen.getByTestId('canvas-runtime')).toHaveAttribute('data-pages', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'Show Pages' }));
    expect(screen.getByTestId('canvas-runtime')).toHaveAttribute('data-pages', 'true');

    fireEvent.click(screen.getByText('emit-view'));
    expect(screen.getByText(/As of/i)).toBeInTheDocument();
    expect(screen.getByText(/Nodes 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Edges 2/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText('emit-error'));
    expect(screen.getByText('boom')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(screen.getByText('graph reload:1')).toBeInTheDocument();
  });
});
