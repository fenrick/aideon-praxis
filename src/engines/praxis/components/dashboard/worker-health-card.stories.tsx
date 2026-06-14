import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { WorkerHealthCard } from './worker-health-card';

const meta = {
  component: WorkerHealthCard,
  tags: ['autodocs'],
  title: 'Workspaces/Praxis/Dashboard/WorkerHealthCard',
  parameters: {
    docs: {
      description: {
        component:
          'Displays worker health status. Calls useWorkerHealth internally via Tauri IPC — renders a checking state until data arrives.',
      },
    },
  },
} satisfies Meta<typeof WorkerHealthCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
