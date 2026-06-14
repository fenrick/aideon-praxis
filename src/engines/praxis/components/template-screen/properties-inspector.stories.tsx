import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { EMPTY_SELECTION } from 'aideon/canvas/types';

import { PropertiesInspector } from './properties-inspector';

const meta = {
  component: PropertiesInspector,
  tags: ['autodocs'],
  title: 'Workspaces/Praxis/TemplateScreen/PropertiesInspector',
} satisfies Meta<typeof PropertiesInspector>;

export default meta;

type Story = StoryObj<typeof meta>;

export const NoSelection: Story = {
  args: {
    selection: EMPTY_SELECTION,
    selectionKind: 'none',
    onSave: () => {
      return;
    },
    onReset: () => {
      return;
    },
  },
};

export const NodeSelected: Story = {
  args: {
    selection: {
      sourceWidgetId: 'widget-graph-1',
      nodeIds: ['node-cap-001'],
      edgeIds: [],
      cellIds: [],
    },
    selectionKind: 'node',
    selectionId: 'node-cap-001',
    properties: {
      name: 'Finance Capability',
      type: 'Capability',
      description: 'Core financial planning capability',
    },
    onSave: () => Promise.resolve(),
    onReset: () => {
      return;
    },
  },
};

export const EdgeSelected: Story = {
  args: {
    selection: {
      sourceWidgetId: 'widget-graph-1',
      nodeIds: [],
      edgeIds: ['edge-dep-001'],
      cellIds: [],
    },
    selectionKind: 'edge',
    selectionId: 'edge-dep-001',
    properties: {
      type: 'depends_on',
      from: 'node-cap-001',
      to: 'node-svc-003',
    },
    onSave: () => Promise.resolve(),
    onReset: () => {
      return;
    },
  },
};

export const WidgetSelected: Story = {
  args: {
    selection: {
      sourceWidgetId: 'widget-graph-1',
      nodeIds: [],
      edgeIds: [],
      cellIds: [],
    },
    selectionKind: 'widget',
    selectionId: 'widget-graph-1',
    properties: {
      name: 'Twin overview',
      dataSource: 'praxis',
      layout: 'force',
    },
    onSave: () => Promise.resolve(),
    onReset: () => {
      return;
    },
  },
};

export const Saving: Story = {
  args: {
    selection: {
      sourceWidgetId: 'widget-graph-1',
      nodeIds: ['node-cap-001'],
      edgeIds: [],
      cellIds: [],
    },
    selectionKind: 'node',
    selectionId: 'node-cap-001',
    properties: {
      name: 'Finance Capability',
      type: 'Capability',
    },
    saving: true,
    onSave: () => Promise.resolve(),
    onReset: () => {
      return;
    },
  },
};

export const WithError: Story = {
  args: {
    selection: {
      sourceWidgetId: 'widget-graph-1',
      nodeIds: ['node-cap-001'],
      edgeIds: [],
      cellIds: [],
    },
    selectionKind: 'node',
    selectionId: 'node-cap-001',
    properties: {
      name: 'Finance Capability',
    },
    error: 'Failed to save changes. Please try again.',
    onSave: () => Promise.resolve(),
    onReset: () => {
      return;
    },
  },
};
