import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { WorkspaceActions } from './workspace-actions';

const meta = {
  component: WorkspaceActions,
  tags: ['autodocs'],
  title: 'Workspaces/Praxis/Chrome/WorkspaceActions',
} satisfies Meta<typeof WorkspaceActions>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
