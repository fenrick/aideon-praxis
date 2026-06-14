import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import type { TemporalPanelActions, TemporalPanelState } from 'praxis/time/use-temporal-panel';

import { TimeControlPanel } from './time-control-panel';

const noopActions: TemporalPanelActions = {
  selectBranch: async () => undefined,
  selectCommit: () => undefined,
  selectLayer: () => undefined,
  refreshBranches: async () => undefined,
  mergeIntoMain: async () => undefined,
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
  snapshot: {
    asOf: 'commit-002',
    scenario: 'main',
    nodes: 42,
    edges: 87,
    confidence: 0.91,
  },
};

const meta = {
  component: TimeControlPanel,
  tags: ['autodocs'],
  title: 'Workspaces/Praxis/Blocks/TimeControlPanel',
} satisfies Meta<typeof TimeControlPanel>;

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
    state: { ...baseState, loading: true, commits: [], branch: undefined },
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

export const WithError: Story = {
  args: {
    state: {
      ...baseState,
      error: 'Failed to load snapshot: connection timed out.',
    },
    actions: noopActions,
  },
};

export const WithMergeConflicts: Story = {
  args: {
    state: {
      ...baseState,
      branch: 'scenario/target-2026',
      mergeConflicts: [
        { reference: 'node/cap-001', kind: 'update', message: 'Conflicting property: name' },
        { reference: 'edge/dep-005', kind: 'delete', message: 'Edge deleted on main' },
      ],
    },
    actions: noopActions,
  },
};

export const CustomTitle: Story = {
  args: {
    title: 'Snapshot controls',
    description: 'Select a branch and moment to view the twin state.',
    state: baseState,
    actions: noopActions,
  },
};
