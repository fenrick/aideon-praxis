import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { ReactFlowProvider } from '@xyflow/react';

import { EMPTY_SELECTION } from 'aideon/canvas/types';

import { CanvasRuntimeCard } from './canvas-runtime-card';

const meta = {
  component: CanvasRuntimeCard,
  tags: ['autodocs'],
  title: 'Workspaces/Praxis/Dashboard/CanvasRuntimeCard',
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
} satisfies Meta<typeof CanvasRuntimeCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: {
    widgets: [],
    selection: EMPTY_SELECTION,
    onSelectionChange: () => undefined,
  },
};

export const WithWidget: Story = {
  args: {
    widgets: [
      {
        id: 'widget-graph-1',
        kind: 'graph',
        title: 'Twin overview',
        size: 'full',
        view: {
          id: 'executive-overview',
          name: 'Executive Overview',
          kind: 'graph',
          asOf: '2025-06-01T00:00:00Z',
          scenario: 'main',
        },
      },
    ],
    selection: EMPTY_SELECTION,
    onSelectionChange: () => undefined,
  },
};

export const WithSelection: Story = {
  args: {
    widgets: [
      {
        id: 'widget-graph-1',
        kind: 'catalogue',
        title: 'Capability catalogue',
        size: 'full',
        view: {
          id: 'cap-catalogue',
          name: 'Capability Catalogue',
          kind: 'catalogue',
          asOf: '2025-06-01T00:00:00Z',
          columns: [
            { id: 'name', label: 'Name', type: 'string' },
            { id: 'state', label: 'State', type: 'string' },
          ],
        },
      },
    ],
    selection: {
      sourceWidgetId: 'widget-graph-1',
      nodeIds: ['node-cap-001', 'node-cap-002'],
      edgeIds: [],
      cellIds: [],
    },
    onSelectionChange: () => undefined,
  },
};
