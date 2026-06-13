import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import type { TemporalPanelActions, TemporalPanelState } from 'praxis/time/use-temporal-panel';

import { ActivityTimelinePanel } from './activity-timeline-panel';

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
  commits: [],
  loading: false,
  snapshotLoading: false,
  merging: false,
  layer: 'Plan',
};

const meta = {
  component: ActivityTimelinePanel,
  tags: ['autodocs'],
  title: 'Workspaces/Praxis/Blocks/ActivityTimelinePanel',
} satisfies Meta<typeof ActivityTimelinePanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: {
    state: baseState,
    actions: noopActions,
  },
};

export const Loading: Story = {
  args: {
    state: { ...baseState, loading: true },
    actions: noopActions,
  },
};

export const WithCommits: Story = {
  args: {
    state: {
      ...baseState,
      commits: [
        {
          id: 'commit-001',
          branch: 'main',
          parents: [],
          message: 'Initial architecture snapshot',
          time: '2025-06-01T10:00:00Z',
          changeCount: 12,
          tags: [],
        },
        {
          id: 'commit-002',
          branch: 'main',
          parents: ['commit-001'],
          message: 'Add capability nodes for Finance domain',
          time: '2025-06-05T14:20:00Z',
          changeCount: 5,
          tags: ['milestone'],
        },
        {
          id: 'commit-003',
          branch: 'main',
          parents: ['commit-002'],
          message: 'Update service dependencies',
          time: '2025-06-10T09:45:00Z',
          changeCount: 3,
          tags: [],
        },
      ],
      commitId: 'commit-002',
    },
    actions: noopActions,
  },
};

export const CustomTitle: Story = {
  args: {
    title: 'Timeline events',
    description: 'Review recent changes to the architecture model.',
    state: baseState,
    actions: noopActions,
  },
};
