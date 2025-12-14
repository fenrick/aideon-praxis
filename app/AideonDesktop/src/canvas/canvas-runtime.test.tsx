import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CanvasRuntime } from './canvas-runtime';
import type { CanvasWidget } from './types';

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
    {
      id: 'g1',
      kind: 'graph',
      title: 'Graph',
      size: 'half',
      view: { id: 'gv', name: 'Graph View', asOf: '2025-01-01', kind: 'graph', layout: 'force' },
    },
    {
      id: 'c1',
      kind: 'catalogue',
      title: 'Catalogue',
      size: 'half',
      view: {
        id: 'cv',
        name: 'Catalogue View',
        kind: 'catalogue',
        asOf: '2025-01-01',
        columns: [],
      },
    },
    {
      id: 'kpi',
      kind: 'chart',
      title: 'Chart',
      size: 'full',
      view: {
        id: 'chv',
        name: 'Chart View',
        kind: 'chart',
        chartType: 'kpi',
        measure: 'm',
        asOf: '2025-01-01',
      },
    },
    {
      id: 'm1',
      kind: 'matrix',
      title: 'Matrix',
      size: 'half',
      view: {
        id: 'mv',
        name: 'Matrix View',
        kind: 'matrix',
        rowType: 'r',
        columnType: 'c',
        asOf: '2025-01-01',
      },
    },
  ];

  it('renders each widget with correct component', () => {
    render(<CanvasRuntime widgets={widgets} reloadVersion={0} />);

    expect(screen.getByText('Graph g1')).toBeInTheDocument();
    expect(screen.getByText('Catalogue c1')).toBeInTheDocument();
    expect(screen.getByText('Chart kpi')).toBeInTheDocument();
    expect(screen.getByText('Matrix m1')).toBeInTheDocument();
  });
});
