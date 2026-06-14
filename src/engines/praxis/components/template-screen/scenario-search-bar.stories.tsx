import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { ScenarioSearchBar } from './scenario-search-bar';

const meta = {
  component: ScenarioSearchBar,
  tags: ['autodocs'],
  title: 'Workspaces/Praxis/TemplateScreen/ScenarioSearchBar',
} satisfies Meta<typeof ScenarioSearchBar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onSearch: () => undefined,
  },
};

export const WithoutCallback: Story = {
  args: {},
};
