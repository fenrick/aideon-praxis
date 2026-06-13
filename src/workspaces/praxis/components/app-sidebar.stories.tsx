import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { SidebarProvider } from 'design-system/components/ui/sidebar';

import { AppSidebar } from './app-sidebar';

const meta = {
  component: AppSidebar,
  tags: ['autodocs'],
  title: 'Workspaces/Praxis/AppSidebar',
  decorators: [(Story) => <SidebarProvider><Story /></SidebarProvider>],
} satisfies Meta<typeof AppSidebar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Loading: Story = {
  args: {
    scenarios: [],
    loading: true,
  },
};

export const Empty: Story = {
  args: {
    scenarios: [],
    loading: false,
  },
};

export const WithScenarios: Story = {
  args: {
    loading: false,
    scenarios: [
      {
        id: 'scenario-1',
        name: 'Current State',
        branch: 'main',
        description: 'Baseline architecture snapshot',
        updatedAt: '2025-06-01T10:00:00Z',
        isDefault: true,
      },
      {
        id: 'scenario-2',
        name: 'Target State 2026',
        branch: 'scenario/target-2026',
        description: 'Target architecture for next year',
        updatedAt: '2025-06-10T14:30:00Z',
      },
    ],
  },
};

export const DefaultScenarioFirst: Story = {
  args: {
    loading: false,
    scenarios: [
      {
        id: 'scenario-a',
        name: 'Alpha Scenario',
        branch: 'scenario/alpha',
        updatedAt: '2025-05-01T09:00:00Z',
        isDefault: false,
      },
      {
        id: 'scenario-b',
        name: 'Beta Scenario',
        branch: 'main',
        updatedAt: '2025-06-01T09:00:00Z',
        isDefault: true,
      },
    ],
  },
};
