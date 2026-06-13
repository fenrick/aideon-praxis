import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { SidebarProvider } from 'design-system/components/ui/sidebar';

import { PRAXIS_WORKSPACE } from './module';
import { PraxisWorkspaceProvider } from './workspace';

const { Content } = PRAXIS_WORKSPACE;

const meta = {
  component: Content,
  tags: ['autodocs'],
  title: 'Workspaces/Praxis/Module',
  decorators: [
    (Story) => (
      <SidebarProvider>
        <PraxisWorkspaceProvider>
          <Story />
        </PraxisWorkspaceProvider>
      </SidebarProvider>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Praxis workspace module registration. Content renders the full workspace — it requires Tauri IPC for data and will show loading states in Storybook.',
      },
    },
    layout: 'fullscreen',
  },
} satisfies Meta<typeof Content>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ContentSlot: Story = {};
