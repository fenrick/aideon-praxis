import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { ActivityFeedCard } from './activity-feed-card';

const meta = {
  component: ActivityFeedCard,
  tags: ['autodocs'],
  title: 'Workspaces/Praxis/Dashboard/ActivityFeedCard',
  parameters: {
    docs: {
      description: {
        component:
          'Wraps ActivityTimelinePanel with the useTemporalPanel hook. Renders a loading state until Tauri IPC responds.',
      },
    },
  },
} satisfies Meta<typeof ActivityFeedCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
