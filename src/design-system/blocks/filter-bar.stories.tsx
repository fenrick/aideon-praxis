import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { FilterBar } from './filter-bar';

const meta = {
  component: FilterBar,
  tags: ['autodocs'],
} satisfies Meta<typeof FilterBar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="w-96">
      <FilterBar placeholder="Filter nodes…" />
    </div>
  ),
};
