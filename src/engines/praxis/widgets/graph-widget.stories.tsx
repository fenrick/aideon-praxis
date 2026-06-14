import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { ReactFlowProvider } from '@xyflow/react';

import { EMPTY_SELECTION } from 'aideon/canvas/types';

import { GraphWidget } from './graph-widget';

const baseWidget = {
  id: 'widget-graph-1',
  kind: 'graph' as const,
  title: 'Twin overview graph',
  size: 'full' as const,
  view: {
    id: 'executive-overview',
    name: 'Executive Overview',
    kind: 'graph' as const,
    asOf: '2025-06-01T00:00:00Z',
    scenario: 'main',
    filters: {
      nodeTypes: ['Capability', 'Application'],
      edgeTypes: ['depends_on', 'supports'],
    },
  },
};

const meta = {
  component: GraphWidget,
  tags: ['autodocs'],
  title: 'Workspaces/Praxis/Widgets/GraphWidget',
  decorators: [
    (Story) => (
      <ReactFlowProvider>
        <Story />
      </ReactFlowProvider>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Full ReactFlow canvas widget. Calls Tauri IPC for graph data — renders a loading skeleton until data arrives.',
      },
    },
  },
} satisfies Meta<typeof GraphWidget>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    widget: baseWidget,
    reloadVersion: 0,
    selection: EMPTY_SELECTION,
    onSelectionChange: () => undefined,
    onViewChange: () => undefined,
    onError: () => undefined,
  },
};

export const WithGraphLayoutContext: Story = {
  args: {
    widget: baseWidget,
    reloadVersion: 0,
    selection: EMPTY_SELECTION,
    graphLayoutContext: {
      docId: 'canvasdoc-executive',
      asOf: '2025-06-01T00:00:00Z',
      scenario: 'main',
      layer: 'Plan',
    },
    onSelectionChange: () => undefined,
    onViewChange: () => undefined,
    onError: () => undefined,
  },
};

export const WithNodeSelection: Story = {
  args: {
    widget: baseWidget,
    reloadVersion: 0,
    selection: {
      sourceWidgetId: 'widget-graph-1',
      nodeIds: ['node-cap-001'],
      edgeIds: [],
      cellIds: [],
    },
    onSelectionChange: () => undefined,
    onViewChange: () => undefined,
    onError: () => undefined,
  },
};
