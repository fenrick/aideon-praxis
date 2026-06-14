import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { BUILT_IN_TEMPLATES } from 'praxis/templates';
import type { TemporalPanelActions, TemporalPanelState } from 'praxis/time/use-temporal-panel';

import { PraxisWorkspaceToolbar } from './praxis-workspace-toolbar';

const noop = () => {
  return;
};

const noopActions: TemporalPanelActions = {
  selectBranch: () => Promise.resolve(),
  selectCommit: noop,
  selectLayer: noop,
  refreshBranches: () => Promise.resolve(),
  mergeIntoMain: () => Promise.resolve(),
};

const firstTemplateId = BUILT_IN_TEMPLATES[0]?.id ?? '';

const baseTemporalState: TemporalPanelState = {
  branches: [{ name: 'main' }, { name: 'scenario/target-2026' }],
  branch: 'main',
  commits: [],
  loading: false,
  snapshotLoading: false,
  merging: false,
  layer: 'Plan',
};

const meta = {
  component: PraxisWorkspaceToolbar,
  tags: ['autodocs'],
  title: 'Workspaces/Praxis/Chrome/PraxisWorkspaceToolbar',
} satisfies Meta<typeof PraxisWorkspaceToolbar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    templates: BUILT_IN_TEMPLATES,
    activeTemplateId: firstTemplateId,
    templateName: 'Executive overview',
    onTemplateChange: noop,
    onTemplateSave: noop,
    onCreateWidget: noop,
    temporalState: baseTemporalState,
    temporalActions: noopActions,
  },
};

export const Loading: Story = {
  args: {
    ...Default.args,
    loading: true,
  },
};

export const NoTemplates: Story = {
  args: {
    templates: [],
    activeTemplateId: '',
    onTemplateChange: noop,
    onTemplateSave: noop,
    onCreateWidget: noop,
    temporalState: baseTemporalState,
    temporalActions: noopActions,
  },
};

export const NoScenario: Story = {
  args: {
    templates: BUILT_IN_TEMPLATES,
    activeTemplateId: firstTemplateId,
    onTemplateChange: noop,
    onTemplateSave: noop,
    onCreateWidget: noop,
    temporalState: { ...baseTemporalState, branch: undefined },
    temporalActions: noopActions,
  },
};
