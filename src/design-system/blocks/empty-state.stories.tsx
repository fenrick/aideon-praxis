import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { EmptyState } from './empty-state';

const meta = {
  component: EmptyState,
  tags: ['autodocs'],
} satisfies Meta<typeof EmptyState>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { title: 'No workspaces yet' } };

export const WithDescription: Story = {
  name: 'With description',
  args: { title: 'No results', description: 'Try adjusting the scope filter or as-of date.' },
};

export const WithAction: Story = {
  name: 'With action',
  args: {
    title: 'No nodes match',
    description: 'Broaden the query or remove a filter.',
    action: (
      <button
        className="bg-primary text-primary-foreground rounded-md px-3 py-1.5 text-sm"
        type="button"
      >
        Clear filters
      </button>
    ),
  },
};
