import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent } from 'storybook/test';

import type { ScenarioSummary } from 'praxis/praxis-api';

import { ScenarioStudioView } from './scenario-studio-surface';

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
  {
    id: 'downturn',
    name: 'Downturn',
    branch: 'downturn-2027',
    updatedAt: '2026-07-12T00:00:00Z',
  },
];

const meta = {
  component: ScenarioStudioView,
  parameters: { layout: 'fullscreen' },
  args: {
    loading: false,
    scenarios,
    activeScenarioId: 'baseline',
    onSelect: fn(),
  },
  render: (properties) => (
    <div className="h-[560px]">
      <ScenarioStudioView {...properties} />
    </div>
  ),
} satisfies Meta<typeof ScenarioStudioView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Loading: Story = {
  args: { loading: true, scenarios: [], activeScenarioId: undefined },
};

export const ErrorState: Story = {
  name: 'Load error',
  args: {
    scenarios: [],
    activeScenarioId: undefined,
    error: 'The host could not read the scenario list.',
  },
};

export const Empty: Story = {
  args: { scenarios: [], activeScenarioId: undefined },
};

export const Selection: Story = {
  name: 'Selecting a scenario',
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByText('Growth 2027'));
    await expect(args.onSelect).toHaveBeenCalledWith('growth');
  },
};
