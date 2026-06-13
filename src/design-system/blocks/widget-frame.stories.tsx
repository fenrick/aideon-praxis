import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { WidgetFrame } from './widget-frame';

const meta = {
  component: WidgetFrame,
  tags: ['autodocs'],
} satisfies Meta<typeof WidgetFrame>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Ready: Story = {
  args: {
    title: 'Revenue trend',
    state: 'ready',
    children: (
      <div className="flex h-32 items-center justify-center text-sm text-gray-400">Chart area</div>
    ),
  },
};

export const Loading: Story = {
  args: { title: 'Revenue trend', state: 'loading' },
};

export const Draggable: Story = {
  name: 'Draggable (edit mode)',
  args: {
    title: 'Revenue trend',
    draggable: true,
    state: 'ready',
    children: (
      <div className="flex h-32 items-center justify-center text-sm text-gray-400">Chart area</div>
    ),
  },
};
