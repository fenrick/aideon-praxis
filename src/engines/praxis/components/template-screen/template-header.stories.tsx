import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { BUILT_IN_LAYOUTS } from 'praxis/layouts';

import { TemplateHeader } from './template-header';

const meta = {
  component: TemplateHeader,
  tags: ['autodocs'],
  title: 'Workspaces/Praxis/TemplateScreen/TemplateHeader',
} satisfies Meta<typeof TemplateHeader>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    scenarioName: 'Current State',
    templateName: 'Executive overview',
    templateDescription: 'Graph + KPI + catalogue snapshot for leadership reviews.',
    templates: BUILT_IN_LAYOUTS,
    activeTemplateId: BUILT_IN_LAYOUTS[0]!.id,
    onTemplateChange: () => undefined,
    onTemplateSave: () => undefined,
    onCreateWidget: () => undefined,
  },
};

export const Loading: Story = {
  args: {
    ...Default.args,
    loading: true,
  },
};

export const NoTemplateSelected: Story = {
  args: {
    scenarioName: 'Current State',
    templates: BUILT_IN_LAYOUTS,
    activeTemplateId: '',
    onTemplateChange: () => undefined,
    onTemplateSave: () => undefined,
    onCreateWidget: () => undefined,
  },
};

export const NoScenario: Story = {
  args: {
    templateName: 'Explorer workspace',
    templates: BUILT_IN_LAYOUTS,
    activeTemplateId: BUILT_IN_LAYOUTS[1]!.id,
    onTemplateChange: () => undefined,
    onTemplateSave: () => undefined,
    onCreateWidget: () => undefined,
  },
};
