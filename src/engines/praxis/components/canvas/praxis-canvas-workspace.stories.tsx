import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { ReactFlowProvider } from '@xyflow/react';

import { EMPTY_SELECTION } from 'aideon/canvas/types';

import { PraxisCanvasWorkspace } from './praxis-canvas-workspace';

const meta = {
  component: PraxisCanvasWorkspace,
  tags: ['autodocs'],
  title: 'Workspaces/Praxis/Canvas/PraxisCanvasWorkspace',
  decorators: [
    (Story) => (
      <ReactFlowProvider>
        <Story />
      </ReactFlowProvider>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof PraxisCanvasWorkspace>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: {
    widgets: [],
    selection: EMPTY_SELECTION,
    onSelectionChange: () => {
      return;
    },
    onAddWidget: () => {
      return;
    },
  },
};

export const WithGraphWidget: Story = {
  args: {
    widgets: [
      {
        id: 'widget-graph-1',
        kind: 'graph',
        title: 'Twin overview graph',
        size: 'full',
        view: {
          id: 'executive-overview',
          name: 'Executive Overview',
          kind: 'graph',
          asOf: '2025-06-01T00:00:00Z',
          scenario: 'main',
          filters: {
            nodeTypes: ['Capability', 'Application'],
          },
        },
      },
    ],
    selection: EMPTY_SELECTION,
    onSelectionChange: () => {
      return;
    },
  },
};

export const WithError: Story = {
  args: {
    widgets: [
      {
        id: 'widget-graph-1',
        kind: 'graph',
        title: 'Twin overview graph',
        size: 'full',
        view: {
          id: 'executive-overview',
          name: 'Executive Overview',
          kind: 'graph',
          asOf: '2025-06-01T00:00:00Z',
        },
      },
    ],
    selection: EMPTY_SELECTION,
    errorMessage: 'Failed to load graph data. Check worker health.',
    onSelectionChange: () => {
      return;
    },
  },
};
