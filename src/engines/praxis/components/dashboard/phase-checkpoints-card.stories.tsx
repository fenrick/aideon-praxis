import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { PhaseCheckpointsCard } from './phase-checkpoints-card';

const meta = {
  component: PhaseCheckpointsCard,
  tags: ['autodocs'],
  title: 'Workspaces/Praxis/Dashboard/PhaseCheckpointsCard',
} satisfies Meta<typeof PhaseCheckpointsCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
