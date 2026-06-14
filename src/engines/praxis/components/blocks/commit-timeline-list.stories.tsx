import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { CommitTimelineList } from './commit-timeline-list';

const meta = {
  component: CommitTimelineList,
  tags: ['autodocs'],
  title: 'Workspaces/Praxis/Blocks/CommitTimelineList',
} satisfies Meta<typeof CommitTimelineList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: {
    commits: [],
    onSelect: () => {
      return;
    },
  },
};

export const WithCommits: Story = {
  args: {
    commits: [
      {
        id: 'commit-001',
        branch: 'main',
        parents: [],
        message: 'Initial architecture snapshot',
        time: '2025-06-01T10:00:00Z',
        changeCount: 12,
        tags: [],
      },
      {
        id: 'commit-002',
        branch: 'main',
        parents: ['commit-001'],
        message: 'Add capability nodes for Finance domain',
        time: '2025-06-05T14:20:00Z',
        changeCount: 5,
        tags: ['milestone'],
      },
      {
        id: 'commit-003',
        branch: 'main',
        parents: ['commit-002'],
        message: 'Update service dependencies',
        time: '2025-06-10T09:45:00Z',
        changeCount: 3,
        tags: [],
      },
    ],
    activeCommitId: 'commit-002',
    onSelect: () => {
      return;
    },
  },
};

export const NoActiveCommit: Story = {
  args: {
    commits: [
      {
        id: 'commit-001',
        branch: 'main',
        parents: [],
        message: 'Initial architecture snapshot',
        time: '2025-06-01T10:00:00Z',
        changeCount: 12,
        tags: [],
      },
    ],
    onSelect: () => {
      return;
    },
  },
};
