import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { EMPTY_SELECTION } from 'aideon/canvas/types';

import { CatalogueWidget } from './catalogue-widget';

const baseWidget = {
  id: 'widget-catalogue-1',
  kind: 'catalogue' as const,
  title: 'Capability catalogue',
  size: 'full' as const,
  view: {
    id: 'capability-catalogue',
    name: 'Capability Catalogue',
    kind: 'catalogue' as const,
    asOf: '2025-06-01T00:00:00Z',
    scenario: 'main',
    columns: [
      { id: 'name', label: 'Name', type: 'string' as const },
      { id: 'owner', label: 'Owner', type: 'string' as const },
      { id: 'state', label: 'State', type: 'string' as const },
    ],
  },
};

const meta = {
  component: CatalogueWidget,
  tags: ['autodocs'],
  title: 'Workspaces/Praxis/Widgets/CatalogueWidget',
  parameters: {
    docs: {
      description: {
        component:
          'Renders a catalogue table. Calls Tauri IPC to load data — shows a loading state until data arrives.',
      },
    },
  },
} satisfies Meta<typeof CatalogueWidget>;

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

export const WithSelection: Story = {
  args: {
    widget: baseWidget,
    reloadVersion: 0,
    selection: {
      sourceWidgetId: 'widget-catalogue-1',
      nodeIds: ['node-cap-001'],
      edgeIds: [],
      cellIds: [],
    },
    onSelectionChange: () => {
      return;
    },
  },
};

export const ReloadTriggered: Story = {
  args: {
    widget: baseWidget,
    reloadVersion: 3,
    selection: EMPTY_SELECTION,
    onSelectionChange: () => {
      return;
    },
  },
};
