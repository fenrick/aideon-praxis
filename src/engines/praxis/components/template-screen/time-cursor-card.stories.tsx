import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import type { TemporalPanelActions, TemporalPanelState } from 'praxis/time/use-temporal-panel';

import { TimeCursorCard } from './time-cursor-card';

const noopActions: TemporalPanelActions = {
  selectBranch: () => Promise.resolve(),
  selectCommit: () => {
    return;
  },
  selectLayer: () => {
    return;
  },
  refreshBranches: () => Promise.resolve(),
  mergeIntoMain: () => Promise.resolve(),
};

const baseState: TemporalPanelState = {
  branches: [{ name: 'main' }, { name: 'scenario/target-2026' }],
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
    {
      id: 'commit-002',
      branch: 'main',
      parents: ['commit-001'],
      message: 'Add Finance domain',
      time: '2025-06-05T14:00:00Z',
      changeCount: 5,
      tags: [],
    },
  ],
  commitId: 'commit-002',
  loading: false,
  snapshotLoading: false,
  merging: false,
  layer: 'Plan',
};

const meta = {
  component: TimeCursorCard,
  tags: ['autodocs'],
  title: 'Workspaces/Praxis/TemplateScreen/TimeCursorCard',
} satisfies Meta<typeof TimeCursorCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
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

export const NonMainBranch: Story = {
  args: {
    state: {
      ...baseState,
      branch: 'scenario/target-2026',
    },
    actions: noopActions,
  },
};

export const SnapshotLoading: Story = {
  args: {
    state: {
      ...baseState,
      snapshotLoading: true,
    },
    actions: noopActions,
  },
};
