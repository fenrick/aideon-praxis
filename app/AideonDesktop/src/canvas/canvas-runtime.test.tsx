import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { CanvasWidget } from './types';
import { CanvasRuntime } from './canvas-runtime';

vi.mock('./widgets/graph-widget', () => ({
  GraphWidget: ({ widget }: { widget: CanvasWidget }) => <div>Graph {widget.id}</div>,
}));
vi.mock('./widgets/catalogue-widget', () => ({
  CatalogueWidget: ({ widget }: { widget: CanvasWidget }) => <div>Catalogue {widget.id}</div>,
}));
vi.mock('./widgets/chart-widget', () => ({
  ChartWidget: ({ widget }: { widget: CanvasWidget }) => <div>Chart {widget.id}</div>,
}));
vi.mock('./widgets/matrix-widget', () => ({
  MatrixWidget: ({ widget }: { widget: CanvasWidget }) => <div>Matrix {widget.id}</div>,
}));

describe('CanvasRuntime', () => {
  const widgets: CanvasWidget[] = [
    { id: 'g1', kind: 'graph', title: 'Graph', size: 'half', view: { kind: 'graph', layout: 'force' } },
    { id: 'c1', kind: 'catalogue', title: 'Catalogue', size: 'half', view: { kind: 'catalogue', columns: [], asOf: '', id: '', name: '' } },
    { id: 'kpi', kind: 'chart', title: 'Chart', size: 'full', view: { kind: 'chart', chartType: 'kpi', measure: 'm', asOf: '', id: '', name: '' } },
    { id: 'm1', kind: 'matrix', title: 'Matrix', size: 'half', view: { kind: 'matrix', rowType: 'r', columnType: 'c', asOf: '', id: '', name: '' } },
  ];

  it('renders each widget with correct component', () => {
    render(
      <CanvasRuntime widgets={widgets} reloadVersion={0} />,
    );

    expect(screen.getByText('Graph g1')).toBeInTheDocument();
    expect(screen.getByText('Catalogue c1')).toBeInTheDocument();
    expect(screen.getByText('Chart kpi')).toBeInTheDocument();
    expect(screen.getByText('Matrix m1')).toBeInTheDocument();
  });
});
