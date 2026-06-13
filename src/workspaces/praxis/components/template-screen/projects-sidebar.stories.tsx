import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { SidebarProvider } from 'design-system/components/ui/sidebar';
import { TooltipProvider } from 'design-system/components/ui/tooltip';

import { ProjectsSidebar } from './projects-sidebar';

const meta = {
  component: ProjectsSidebar,
  tags: ['autodocs'],
  title: 'Workspaces/Praxis/TemplateScreen/ProjectsSidebar',
  decorators: [(Story) => <TooltipProvider><SidebarProvider><Story /></SidebarProvider></TooltipProvider>],
} satisfies Meta<typeof ProjectsSidebar>;

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
        description: 'Baseline architecture',
        updatedAt: '2025-06-01T10:00:00Z',
        isDefault: true,
      },
      {
        id: 'scenario-2',
        name: 'Target State 2026',
        branch: 'scenario/target-2026',
        updatedAt: '2025-06-10T14:30:00Z',
      },
      {
        id: 'scenario-3',
        name: 'Cloud Migration',
        branch: 'scenario/cloud-migration',
        updatedAt: '2025-05-20T09:00:00Z',
      },
    ],
    activeScenarioId: 'scenario-1',
    onSelectScenario: () => undefined,
  },
};

export const WithError: Story = {
  args: {
    scenarios: [],
    loading: false,
    error: 'Failed to load scenarios. Check your connection.',
    onRetry: () => undefined,
  },
};

export const ActiveScenario: Story = {
  args: {
    loading: false,
    scenarios: [
      {
        id: 'scenario-1',
        name: 'Current State',
        branch: 'main',
        updatedAt: '2025-06-01T10:00:00Z',
        isDefault: true,
      },
      {
        id: 'scenario-2',
        name: 'Target State 2026',
        branch: 'scenario/target-2026',
        updatedAt: '2025-06-10T14:30:00Z',
      },
    ],
    activeScenarioId: 'scenario-2',
    onSelectScenario: () => undefined,
  },
};
