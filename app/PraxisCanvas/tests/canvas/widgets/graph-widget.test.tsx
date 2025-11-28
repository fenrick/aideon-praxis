import type { GraphWidgetConfig } from '@/canvas/types';
import type { GraphViewModel } from '@/praxis-api';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getGraphViewMock = vi.fn<
  Parameters<(typeof import('@/praxis-api'))['getGraphView']>,
  ReturnType<(typeof import('@/praxis-api'))['getGraphView']>
>();

vi.mock('@/praxis-api', async () => {
  const actual = await vi.importActual<typeof import('@/praxis-api')>('@/praxis-api');
  return {
    ...actual,
    getGraphView: (...args: Parameters<typeof actual.getGraphView>) =>
      getGraphViewMock(...args) as ReturnType<typeof actual.getGraphView>,
  };
});

vi.mock('@aideon/design-system/reactflow/node-search', () => ({
  NodeSearchDialog: () => null,
}));

let latestSelectionHandler:
  | ((selection: { nodes?: { id: string }[]; edges?: { id: string }[] }) => void)
  | undefined;

vi.mock('@xyflow/react', () => {
  const React = require('react');
  const { createElement } = React;
  return {
    ReactFlowProvider: ({ children }: { children?: React.ReactNode }) =>
      createElement('div', { 'data-testid': 'reactflow-provider' }, children),
    ReactFlow: ({
      children,
      onSelectionChange,
    }: {
      children?: React.ReactNode;
      onSelectionChange?: (selection: {
        nodes?: { id: string }[];
        edges?: { id: string }[];
      }) => void;
    }) => {
      latestSelectionHandler = onSelectionChange ?? undefined;
      return createElement('div', { 'data-testid': 'reactflow' }, children);
    },
    Controls: () => createElement('div', { 'data-testid': 'controls' }),
    Background: () => createElement('div', { 'data-testid': 'background' }),
    BackgroundVariant: { Dots: 'dots' },
    useNodesState: () => [[], vi.fn(), vi.fn()],
    useEdgesState: () => [[], vi.fn(), vi.fn()],
    useReactFlow: () => ({
      getNodes: () => [],
      setNodes: (updater: (nodes: []) => []) => updater([]),
      fitView: vi.fn(),
    }),
    Panel: ({ children }: { children?: React.ReactNode }) =>
      createElement('div', { 'data-testid': 'panel' }, children),
  };
});

import { GraphWidget } from '@/canvas/widgets/graph-widget';

const GRAPH_WIDGET: GraphWidgetConfig = {
  id: 'graph-widget',
  kind: 'graph',
  title: 'Customer Graph',
  view: {
    id: 'view-graph',
    name: 'Customer Experience',
    kind: 'graph',
    asOf: '2025-11-01T00:00:00.000Z',
  },
};

const GRAPH_VIEW: GraphViewModel = {
  metadata: {
    id: 'view-graph',
    name: 'Customer Experience',
    asOf: '2025-11-01T00:00:00.000Z',
    fetchedAt: '2025-11-01T00:01:00.000Z',
    scenario: 'main',
    source: 'mock',
  },
  stats: { nodes: 1, edges: 0 },
  nodes: [
    {
      id: 'node-1',
      label: 'Customer Onboarding',
      type: 'Capability',
      position: { x: 10, y: 20 },
    },
  ],
  edges: [],
};

describe('GraphWidget', () => {
  beforeEach(() => {
    getGraphViewMock.mockReset();
    latestSelectionHandler = undefined;
  });

  it('loads the graph view on mount and surfaces metadata/context to parents', async () => {
    getGraphViewMock.mockResolvedValue(GRAPH_VIEW);
    const onViewChange = vi.fn();

    render(<GraphWidget widget={GRAPH_WIDGET} reloadVersion={0} onViewChange={onViewChange} />);

    await waitFor(() => expect(onViewChange).toHaveBeenCalledWith(GRAPH_VIEW));
    expect(getGraphViewMock).toHaveBeenCalledWith(expect.objectContaining({ id: 'view-graph' }));
    expect(screen.getByText('Customer Experience')).toBeInTheDocument();
  });

  it('propagates selection changes originating from React Flow', async () => {
    getGraphViewMock.mockResolvedValue(GRAPH_VIEW);
    const onSelectionChange = vi.fn();

    render(
      <GraphWidget widget={GRAPH_WIDGET} reloadVersion={0} onSelectionChange={onSelectionChange} />,
    );

    await waitFor(() => {
      expect(getGraphViewMock).toHaveBeenCalled();
      expect(latestSelectionHandler).toBeDefined();
    });
    latestSelectionHandler?.({ nodes: [{ id: 'node-1' }], edges: [] });
    expect(onSelectionChange).toHaveBeenCalledWith({
      widgetId: 'graph-widget',
      nodeIds: ['node-1'],
      edgeIds: [],
    });
  });

  it('renders an error overlay and emits the message when view loading fails', async () => {
    getGraphViewMock.mockRejectedValue(new Error('IPC offline'));
    const onError = vi.fn();

    render(<GraphWidget widget={GRAPH_WIDGET} reloadVersion={1} onError={onError} />);

    expect(await screen.findByText('IPC offline')).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith('IPC offline');
  });
});
