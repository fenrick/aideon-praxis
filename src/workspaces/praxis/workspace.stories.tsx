import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { SidebarProvider } from 'design-system/components/ui/sidebar';
import { TooltipProvider } from 'design-system/components/ui/tooltip';

import { PraxisWorkspaceSurface } from './workspace';

const meta = {
  component: PraxisWorkspaceSurface,
  tags: ['autodocs'],
  title: 'Workspaces/Praxis/WorkspaceSurface',
  decorators: [(Story) => <TooltipProvider><SidebarProvider><Story /></SidebarProvider></TooltipProvider>],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Full Praxis workspace surface. Orchestrates scenarios, templates, widgets, canvas, and temporal state. Requires Tauri IPC — renders loading states in Storybook.',
      },
    },
  },
} satisfies Meta<typeof PraxisWorkspaceSurface>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onSelectionChange: () => undefined,
  },
};
