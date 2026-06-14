import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { EMPTY_SELECTION } from 'aideon/canvas/types';

import { DebugOverlay } from './debug-overlay';

const meta = {
  component: DebugOverlay,
  tags: ['autodocs'],
  title: 'Workspaces/Praxis/DebugOverlay',
} satisfies Meta<typeof DebugOverlay>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Hidden: Story = {
  args: {
    visible: false,
  },
};

export const Visible: Story = {
  args: {
    visible: true,
    scenarioName: 'Current State',
    templateName: 'Executive overview',
    commitId: 'commit-abc123',
    branch: 'main',
    selection: {
      sourceWidgetId: 'widget-graph-1',
      nodeIds: ['node-cap-001'],
      edgeIds: [],
      cellIds: [],
    },
  },
};

export const VisibleNoSelection: Story = {
  args: {
    visible: true,
    scenarioName: 'Target State 2026',
    templateName: 'Explorer workspace',
    commitId: 'commit-def456',
    branch: 'scenario/target-2026',
    selection: EMPTY_SELECTION,
  },
};

export const VisibleMinimal: Story = {
  args: {
    visible: true,
  },
};
