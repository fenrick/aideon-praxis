import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { PartialBanner } from './partial-banner';

const meta = {
  component: PartialBanner,
  tags: ['autodocs'],
} satisfies Meta<typeof PartialBanner>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { message: 'Showing 50 of 1,240 nodes. Apply a scope filter to narrow results.' },
};
