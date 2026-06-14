import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { EMPTY_SELECTION } from 'aideon/canvas/types';

import { MatrixWidget } from './matrix-widget';

const baseWidget = {
  id: 'widget-matrix-1',
  kind: 'matrix' as const,
  title: 'Capability ↔ Service coverage',
  size: 'half' as const,
  view: {
    id: 'capability-to-service',
    name: 'Capability ↔ Service Matrix',
    kind: 'matrix' as const,
    asOf: '2025-06-01T00:00:00Z',
    scenario: 'main',
    rowType: 'Capability',
    columnType: 'Service',
    relationship: 'depends_on',
  },
};

const meta = {
  component: MatrixWidget,
  tags: ['autodocs'],
  title: 'Workspaces/Praxis/Widgets/MatrixWidget',
  parameters: {
    docs: {
      description: {
        component:
          'Cross-tab relationship matrix. Calls Tauri IPC to load data — shows a loading state until data arrives.',
      },
    },
  },
} satisfies Meta<typeof MatrixWidget>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    widget: baseWidget,
    reloadVersion: 0,
    selection: EMPTY_SELECTION,
    onSelectionChange: () => {
      return;
    },
  },
};

export const WithCellSelection: Story = {
  args: {
    widget: baseWidget,
    reloadVersion: 0,
    selection: {
      sourceWidgetId: 'widget-matrix-1',
      nodeIds: [],
      edgeIds: [],
      cellIds: ['cap-001::svc-003'],
    },
    onSelectionChange: () => {
      return;
    },
  },
};
