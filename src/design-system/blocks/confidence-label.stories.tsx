import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { ConfidenceLabel } from './confidence-label';

const meta = {
  component: ConfidenceLabel,
  tags: ['autodocs'],
} satisfies Meta<typeof ConfidenceLabel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const High: Story = { args: { tier: 'high' } };
export const Medium: Story = { args: { tier: 'medium' } };
export const Low: Story = { args: { tier: 'low' } };
export const Indicative: Story = { args: { tier: 'indicative' } };
