import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from './sidebar';
import { DesktopShell } from './desktop-shell';

const meta = {
  component: DesktopShell,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DesktopShell>;

export default meta;

type Story = StoryObj<typeof meta>;

function SampleTree() {
  return (
    <Sidebar>
      <SidebarHeader className="px-3 py-2 font-semibold text-sm">Aideon</SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Scenarios</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {['Current State', 'Future State', 'Option A'].map((item) => (
                <SidebarMenuItem key={item}>
                  <SidebarMenuButton>{item}</SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

function SampleToolbar() {
  return (
    <nav className="flex items-center gap-2">
      <span className="text-sm font-medium">Current State</span>
      <span className="text-muted-foreground text-xs">/ Praxis Canvas</span>
    </nav>
  );
}

function SampleMain() {
  return (
    <div className="flex h-full items-center justify-center rounded-md border border-dashed">
      <p className="text-muted-foreground text-sm">Canvas area</p>
    </div>
  );
}

function SampleProperties() {
  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <p className="text-sm font-semibold">Properties</p>
      <p className="text-muted-foreground text-xs">Select a node to inspect its properties.</p>
    </div>
  );
}

export const Default: Story = {
  name: 'Full shell layout',
  render: () => (
    <div style={{ height: '600px' }}>
      <DesktopShell
        tree={<SampleTree />}
        toolbar={<SampleToolbar />}
        main={<SampleMain />}
        properties={<SampleProperties />}
      />
    </div>
  ),
};

export const MinimalSlots: Story = {
  name: 'Minimal slot content',
  render: () => (
    <div style={{ height: '600px' }}>
      <DesktopShell
        tree={
          <Sidebar>
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupLabel>Items</SidebarGroupLabel>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>
        }
        toolbar={<span className="text-sm">Toolbar</span>}
        main={
          <div className="flex h-full items-center justify-center">
            <p className="text-muted-foreground text-sm">Main content</p>
          </div>
        }
        properties={
          <div className="p-4">
            <p className="text-muted-foreground text-xs">Properties panel</p>
          </div>
        }
      />
    </div>
  ),
};
