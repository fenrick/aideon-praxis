import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { TimeCursorCard } from './time-cursor-card';

const meta = {
  component: TimeCursorCard,
  tags: ['autodocs'],
  title: 'Workspaces/Praxis/Dashboard/TimeCursorCard',
  parameters: {
    docs: {
      description: {
        component:
          'Wraps TimeControlPanel with the useTemporalPanel hook. Renders a loading skeleton until Tauri IPC responds.',
      },
    },
  },
} satisfies Meta<typeof TimeCursorCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
