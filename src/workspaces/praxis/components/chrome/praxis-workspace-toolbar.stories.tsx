import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import type { TemporalPanelActions, TemporalPanelState } from 'praxis/time/use-temporal-panel';
import { BUILT_IN_TEMPLATES } from 'praxis/templates';

import { PraxisWorkspaceToolbar } from './praxis-workspace-toolbar';

const noopActions: TemporalPanelActions = {
  selectBranch: async () => undefined,
  selectCommit: () => undefined,
  selectLayer: () => undefined,
  refreshBranches: async () => undefined,
  mergeIntoMain: async () => undefined,
};

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
    scenarioName: 'Current State',
    templates: BUILT_IN_TEMPLATES,
    activeTemplateId: BUILT_IN_TEMPLATES[0]!.id,
    templateName: 'Executive overview',
    onTemplateChange: () => undefined,
    onTemplateSave: () => undefined,
    onCreateWidget: () => undefined,
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
    scenarioName: 'Current State',
    templates: [],
    activeTemplateId: '',
    onTemplateChange: () => undefined,
    onTemplateSave: () => undefined,
    onCreateWidget: () => undefined,
    temporalState: baseTemporalState,
    temporalActions: noopActions,
  },
};

export const NoScenario: Story = {
  args: {
    templates: BUILT_IN_TEMPLATES,
    activeTemplateId: BUILT_IN_TEMPLATES[0]!.id,
    onTemplateChange: () => undefined,
    onTemplateSave: () => undefined,
    onCreateWidget: () => undefined,
    temporalState: { ...baseTemporalState, branch: undefined },
    temporalActions: noopActions,
  },
};
