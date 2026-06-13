import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { TemporalCommandMenu } from './temporal-command-menu';

const meta = {
  component: TemporalCommandMenu,
  tags: ['autodocs'],
  title: 'Workspaces/Praxis/Blocks/TemporalCommandMenu',
} satisfies Meta<typeof TemporalCommandMenu>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Closed: Story = {
  args: {
    open: false,
    onOpenChange: () => undefined,
    branches: [],
    commits: [],
    loading: false,
    onSelectBranch: () => undefined,
    onSelectCommit: () => undefined,
    onRefreshBranches: () => undefined,
  },
};

export const Open: Story = {
  args: {
    open: true,
    onOpenChange: () => undefined,
    branches: [
      { name: 'main' },
      { name: 'scenario/target-2026' },
      { name: 'scenario/alpha-test' },
    ],
    activeBranch: 'main',
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
        message: 'Add Finance capabilities',
        time: '2025-06-05T14:20:00Z',
        changeCount: 5,
        tags: [],
      },
    ],
    loading: false,
    onSelectBranch: () => undefined,
    onSelectCommit: () => undefined,
    onRefreshBranches: () => undefined,
    catalogueEntries: [
      { id: 'cap-001', label: 'Finance Capability', owner: 'CFO Office', state: 'Active' },
      { id: 'cap-002', label: 'HR Capability', owner: 'People Team', state: 'In progress' },
    ],
    metaModelEntries: [
      { id: 'mm-001', label: 'Capability', category: 'Business', kind: 'type' },
      { id: 'mm-002', label: 'depends_on', category: 'Relationships', kind: 'relationship' },
    ],
    onSelectCatalogueEntry: () => undefined,
    onSelectMetaModelEntry: () => undefined,
  },
};

export const Loading: Story = {
  args: {
    open: true,
    onOpenChange: () => undefined,
    branches: [],
    commits: [],
    loading: true,
    onSelectBranch: () => undefined,
    onSelectCommit: () => undefined,
    onRefreshBranches: () => undefined,
  },
};
