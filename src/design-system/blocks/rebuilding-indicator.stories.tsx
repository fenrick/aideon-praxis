import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { RebuildingIndicator } from './rebuilding-indicator';

const meta = {
  component: RebuildingIndicator,
  tags: ['autodocs'],
} satisfies Meta<typeof RebuildingIndicator>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = { args: {} };
export const CustomLabel: Story = { args: { label: 'Indexing graph…' } };
