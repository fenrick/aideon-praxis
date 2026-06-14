import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { StaleBadge } from './stale-badge';

const meta = {
  component: StaleBadge,
  tags: ['autodocs'],
} satisfies Meta<typeof StaleBadge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = { args: {} };
export const WithTimestamp: Story = { args: { timestamp: '3h ago' } };
