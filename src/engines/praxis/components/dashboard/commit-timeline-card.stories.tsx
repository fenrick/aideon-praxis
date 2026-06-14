import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { CommitTimelineCard } from './commit-timeline-card';

const meta = {
  component: CommitTimelineCard,
  tags: ['autodocs'],
  title: 'Workspaces/Praxis/Dashboard/CommitTimelineCard',
  parameters: {
    docs: {
      description: {
        component:
          'Renders the commit timeline with branch selector. Uses useTemporalPanel internally — renders a loading skeleton until Tauri IPC responds.',
      },
    },
  },
} satisfies Meta<typeof CommitTimelineCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
