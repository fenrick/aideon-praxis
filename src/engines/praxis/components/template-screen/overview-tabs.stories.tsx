import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { ReactFlowProvider } from '@xyflow/react';

import { EMPTY_SELECTION } from 'aideon/canvas/types';
import type { TemporalPanelActions, TemporalPanelState } from 'praxis/time/use-temporal-panel';

import { OverviewTabs } from './overview-tabs';

const noopActions: TemporalPanelActions = {
  selectBranch: async () => undefined,
  selectCommit: () => undefined,
  selectLayer: () => undefined,
  refreshBranches: async () => undefined,
  mergeIntoMain: async () => undefined,
};

const baseState: TemporalPanelState = {
  branches: [{ name: 'main' }],
  branch: 'main',
  commits: [
    {
      id: 'commit-001',
      branch: 'main',
      parents: [],
      message: 'Initial snapshot',
      time: '2025-06-01T10:00:00Z',
      changeCount: 12,
      tags: [],
    },
  ],
  commitId: 'commit-001',
  loading: false,
  snapshotLoading: false,
  merging: false,
  layer: 'Plan',
  snapshot: {
    asOf: 'commit-001',
    scenario: 'main',
    nodes: 42,
    edges: 87,
  },
};

const meta = {
  component: OverviewTabs,
  tags: ['autodocs'],
  title: 'Workspaces/Praxis/TemplateScreen/OverviewTabs',
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
} satisfies Meta<typeof OverviewTabs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const CanvasTab: Story = {
  args: {
    state: baseState,
    actions: noopActions,
    widgets: [],
    selection: EMPTY_SELECTION,
    onSelectionChange: () => undefined,
    onRequestMetaModelFocus: () => undefined,
    initialTab: 'canvas',
  },
};

export const OverviewTab: Story = {
  args: {
    state: baseState,
    actions: noopActions,
    widgets: [],
    selection: EMPTY_SELECTION,
    onSelectionChange: () => undefined,
    onRequestMetaModelFocus: () => undefined,
    initialTab: 'overview',
  },
};

export const TimelineTab: Story = {
  args: {
    state: baseState,
    actions: noopActions,
    widgets: [],
    selection: EMPTY_SELECTION,
    onSelectionChange: () => undefined,
    onRequestMetaModelFocus: () => undefined,
    initialTab: 'timeline',
  },
};

export const ActivityTab: Story = {
  args: {
    state: baseState,
    actions: noopActions,
    widgets: [],
    selection: EMPTY_SELECTION,
    onSelectionChange: () => undefined,
    onRequestMetaModelFocus: () => undefined,
    initialTab: 'activity',
  },
};
