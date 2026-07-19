import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import type { ScenarioSummary, TemporalCommitSummary } from 'praxis/praxis-api';

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

const commits: TemporalCommitSummary[] = [
  {
    id: 'c0d1e2f3a4b5',
    branch: 'main',
    parents: [],
    message: 'Seed workspace',
    tags: [],
    changeCount: 12,
  },
  {
    id: 'a1b2c3d4e5f6',
    branch: 'main',
    parents: ['c0d1e2f3a4b5'],
    message: 'Add billing capability',
    tags: [],
    changeCount: 4,
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
    commits,
    commitId: 'a1b2c3d4e5f6',
    onSelectCommit: fn(),
    layer: 'Plan',
    onSelectLayer: fn(),
    timeLoading: false,
    onAddWidget: fn(),
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
  name: 'Latest (newest commit)',
  args: {
    commitId: 'a1b2c3d4e5f6',
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
    commits: [],
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
    commits: [],
    commitId: undefined,
  },
};

export const LayerInteraction: Story = {
  name: 'Layer control drives selection',
  args: { onSelectLayer: fn() },
  play: async ({ canvas, args }) => {
    const trigger = canvas.getByTestId('toolbar-layer-select');
    await userEvent.click(trigger);
    const option = await within(document.body).findByRole('option', { name: 'Actual' });
    await userEvent.click(option);
    await expect(args.onSelectLayer).toHaveBeenCalledWith('Actual');
  },
};
