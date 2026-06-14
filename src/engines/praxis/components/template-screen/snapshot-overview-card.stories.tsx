import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import type { TemporalPanelState } from 'praxis/time/use-temporal-panel';

import { SnapshotOverviewCard } from './snapshot-overview-card';

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
  component: SnapshotOverviewCard,
  tags: ['autodocs'],
  title: 'Workspaces/Praxis/TemplateScreen/SnapshotOverviewCard',
} satisfies Meta<typeof SnapshotOverviewCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Loading: Story = {
  args: {
    state: { ...baseState, loading: true },
  },
};

export const NoSnapshot: Story = {
  args: {
    state: baseState,
  },
};

export const WithSnapshot: Story = {
  args: {
    state: {
      ...baseState,
      snapshot: {
        asOf: 'commit-abc123',
        scenario: 'main',
        nodes: 142,
        edges: 287,
        confidence: 0.94,
      },
    },
  },
};

export const WithError: Story = {
  args: {
    state: {
      ...baseState,
      error: 'Failed to load snapshot data.',
    },
  },
};

export const HighConfidence: Story = {
  args: {
    state: {
      ...baseState,
      snapshot: {
        asOf: 'commit-latest',
        scenario: 'scenario/target-2026',
        nodes: 310,
        edges: 521,
        confidence: 0.99,
      },
    },
  },
};
