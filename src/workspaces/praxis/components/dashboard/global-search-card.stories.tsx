import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { GlobalSearchCard } from './global-search-card';

const meta = {
  component: GlobalSearchCard,
  tags: ['autodocs'],
  title: 'Workspaces/Praxis/Dashboard/GlobalSearchCard',
} satisfies Meta<typeof GlobalSearchCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onSelectNodes: () => undefined,
    onFocusMetaModel: () => undefined,
    onShowTimeline: () => undefined,
  },
};

export const WithoutCallbacks: Story = {
  args: {},
};
