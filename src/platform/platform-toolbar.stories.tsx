import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import type { ScenarioSummary } from 'praxis/praxis-api';

import { ToolbarControlBand } from './platform-toolbar';

const scenarios: ScenarioSummary[] = [
  {
    id: 'baseline',
    name: 'Baseline',
    branch: 'main',
    updatedAt: '2026-07-01T00:00:00Z',
    isDefault: true,
  },
  {
    id: 'growth',
    name: 'Growth 2027',
    branch: 'growth-2027',
    updatedAt: '2026-07-10T00:00:00Z',
  },
];

const noopReference = fn();
const noopSelect = fn();

const meta = {
  component: ToolbarControlBand,
  parameters: { layout: 'fullscreen' },
  args: {
    templateName: 'Capability landscape',
    scenarios,
    scenariosLoading: false,
    activeScenarioId: 'baseline',
    onSelectScenario: noopSelect,
    scenarioTriggerReference: noopReference,
    branch: 'main',
    commitId: 'a1b2c3d4e5f6',
    layer: 'Plan',
    timeLoading: false,
  },
  render: (properties) => (
    <div className="border-border/60 border-t">
      <ToolbarControlBand {...properties} />
    </div>
  ),
} satisfies Meta<typeof ToolbarControlBand>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LatestCommit: Story = {
  name: 'Latest (no commit)',
  args: {
    commitId: undefined,
    branch: 'growth-2027',
    activeScenarioId: 'growth',
  },
};

export const Loading: Story = {
  args: {
    scenarios: [],
    scenariosLoading: true,
    activeScenarioId: undefined,
    timeLoading: true,
    branch: undefined,
    commitId: undefined,
  },
};

export const NoScenarios: Story = {
  name: 'No scenarios',
  args: {
    scenarios: [],
    scenariosLoading: false,
    activeScenarioId: undefined,
    templateName: undefined,
  },
};
