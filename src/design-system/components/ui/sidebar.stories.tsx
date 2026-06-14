import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { HomeIcon, SettingsIcon, UsersIcon } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from './sidebar';

const meta = {
  component: SidebarProvider,
  tags: ['autodocs'],
} satisfies Meta<typeof SidebarProvider>;
export default meta;
type Story = StoryObj<typeof meta>;

function DemoSidebar() {
  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg">
              <span className="font-semibold">Aideon</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton isActive>
                <HomeIcon />
                <span>Home</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton>
                <UsersIcon />
                <span>Team</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton>
              <SettingsIcon />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

export const Default: Story = {
  render: () => (
    <SidebarProvider style={{ '--sidebar-width': '14rem' } as React.CSSProperties}>
      <DemoSidebar />
      <main className="flex flex-1 flex-col gap-4 p-6">
        <SidebarTrigger />
        <p className="text-sm text-muted-foreground">Main content area</p>
      </main>
    </SidebarProvider>
  ),
};

export const DefaultCollapsed: Story = {
  render: () => (
    <SidebarProvider defaultOpen={false} style={{ '--sidebar-width': '14rem' } as React.CSSProperties}>
      <DemoSidebar />
      <main className="flex flex-1 flex-col gap-4 p-6">
        <SidebarTrigger />
        <p className="text-sm text-muted-foreground">Sidebar starts collapsed</p>
      </main>
    </SidebarProvider>
  ),
};
