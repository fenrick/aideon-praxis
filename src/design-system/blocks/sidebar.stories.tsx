import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { SidebarHeading, SidebarNav, SidebarSection, SidebarShell } from './sidebar';

const meta = {
  component: SidebarShell,
  tags: ['autodocs'],
} satisfies Meta<typeof SidebarShell>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <SidebarShell>
      <SidebarSection>
        <SidebarHeading>Navigation</SidebarHeading>
        <SidebarNav>
          <a href="#" className="rounded px-2 py-1.5 hover:bg-muted">Dashboard</a>
          <a href="#" className="rounded px-2 py-1.5 hover:bg-muted">Graph</a>
          <a href="#" className="rounded px-2 py-1.5 hover:bg-muted">Timeline</a>
        </SidebarNav>
      </SidebarSection>
      <SidebarSection>
        <SidebarHeading>Tools</SidebarHeading>
        <SidebarNav>
          <a href="#" className="rounded px-2 py-1.5 hover:bg-muted">Settings</a>
        </SidebarNav>
      </SidebarSection>
    </SidebarShell>
  ),
};

export const Unpadded: Story = {
  name: 'Section without padding',
  render: () => (
    <SidebarShell>
      <SidebarSection padded={false}>
        <div className="bg-muted h-24 w-full" />
      </SidebarSection>
      <SidebarSection>
        <SidebarHeading>Items</SidebarHeading>
        <SidebarNav>
          <a href="#" className="rounded px-2 py-1.5 hover:bg-muted">Item A</a>
          <a href="#" className="rounded px-2 py-1.5 hover:bg-muted">Item B</a>
        </SidebarNav>
      </SidebarSection>
    </SidebarShell>
  ),
};
