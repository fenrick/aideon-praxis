import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { EMPTY_SELECTION } from 'aideon/canvas/types';

import { SelectionInspectorCard } from './selection-inspector-card';

const meta = {
  component: SelectionInspectorCard,
  tags: ['autodocs'],
  title: 'Workspaces/Praxis/Dashboard/SelectionInspectorCard',
} satisfies Meta<typeof SelectionInspectorCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const NoSelection: Story = {
  args: {
    selection: EMPTY_SELECTION,
    widgets: [],
    onSelectionChange: () => undefined,
  },
};

export const NodeSelection: Story = {
  args: {
    selection: {
      sourceWidgetId: 'widget-graph-1',
      nodeIds: ['node-cap-001', 'node-cap-002'],
      edgeIds: [],
      cellIds: [],
    },
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
        },
      },
    ],
    onSelectionChange: () => undefined,
  },
};

export const EdgeSelection: Story = {
  args: {
    selection: {
      sourceWidgetId: 'widget-graph-1',
      nodeIds: [],
      edgeIds: ['edge-dep-001'],
      cellIds: [],
    },
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
        },
      },
    ],
    onSelectionChange: () => undefined,
  },
};

export const CellSelection: Story = {
  args: {
    selection: {
      sourceWidgetId: 'widget-matrix-1',
      nodeIds: [],
      edgeIds: [],
      cellIds: ['cap-001::svc-003'],
    },
    widgets: [
      {
        id: 'widget-matrix-1',
        kind: 'matrix',
        title: 'Capability matrix',
        size: 'half',
        view: {
          id: 'cap-matrix',
          name: 'Capability Matrix',
          kind: 'matrix',
          asOf: '2025-06-01T00:00:00Z',
          rowType: 'Capability',
          columnType: 'Service',
        },
      },
    ],
    onSelectionChange: () => undefined,
  },
};
