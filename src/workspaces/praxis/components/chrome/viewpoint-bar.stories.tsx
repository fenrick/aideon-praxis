import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import type { TemporalPanelActions, TemporalPanelState } from 'praxis/time/use-temporal-panel';

import { ViewpointBar } from './viewpoint-bar';

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

const commits = [
  {
    id: 'c1',
    branch: 'main',
    parents: [],
    message: 'Seed baseline',
    time: '2026-06-10T09:00:00Z',
    tags: [],
    changeCount: 12,
  },
  {
    id: 'c2',
    branch: 'main',
    parents: ['c1'],
    message: 'Add capability map',
    time: '2026-06-12T14:30:00Z',
    tags: [],
    changeCount: 4,
  },
  {
    id: 'c3',
    branch: 'main',
    parents: ['c2'],
    message: 'Cost rollup',
    time: '2026-06-14T08:15:00Z',
    tags: [],
    changeCount: 7,
  },
];

const baseState: TemporalPanelState = {
  branches: [{ name: 'main' }, { name: 'scenario/target-2026' }],
  branch: 'main',
  commits,
  commitId: 'c3',
  loading: false,
  snapshotLoading: false,
  merging: false,
  layer: 'Plan',
};

const meta = {
  component: ViewpointBar,
  tags: ['autodocs'],
  title: 'Workspaces/Praxis/Chrome/ViewpointBar',
  parameters: {
    docs: {
      description: {
        component:
          'Always-visible control band exposing the three viewpoint coordinates — scenario, as-of moment, and layer. Never collapsible; changing a coordinate re-executes the active view.',
      },
    },
  },
} satisfies Meta<typeof ViewpointBar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const AtLatest: Story = {
  args: {
    state: baseState,
    actions: noopActions,
  },
};

export const PinnedToPastMoment: Story = {
  args: {
    state: { ...baseState, commitId: 'c1' },
    actions: noopActions,
  },
};

export const ScenarioOverlay: Story = {
  args: {
    state: { ...baseState, branch: 'scenario/target-2026', layer: 'Actual' },
    actions: noopActions,
  },
};

export const Loading: Story = {
  args: {
    state: {
      branches: [],
      commits: [],
      loading: true,
      snapshotLoading: false,
      merging: false,
      layer: 'Plan',
    },
    actions: noopActions,
  },
};

export const NoScenario: Story = {
  args: {
    state: {
      branches: [],
      commits: [],
      loading: false,
      snapshotLoading: false,
      merging: false,
      layer: 'Plan',
    },
    actions: noopActions,
  },
};
