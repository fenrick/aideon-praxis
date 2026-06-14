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
          <a href="https://example.com" className="hover:bg-muted rounded px-2 py-1.5">
            Dashboard
          </a>
          <a href="https://example.com" className="hover:bg-muted rounded px-2 py-1.5">
            Graph
          </a>
          <a href="https://example.com" className="hover:bg-muted rounded px-2 py-1.5">
            Timeline
          </a>
        </SidebarNav>
      </SidebarSection>
      <SidebarSection>
        <SidebarHeading>Tools</SidebarHeading>
        <SidebarNav>
          <a href="https://example.com" className="hover:bg-muted rounded px-2 py-1.5">
            Settings
          </a>
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
          <a href="https://example.com" className="hover:bg-muted rounded px-2 py-1.5">
            Item A
          </a>
          <a href="https://example.com" className="hover:bg-muted rounded px-2 py-1.5">
            Item B
          </a>
        </SidebarNav>
      </SidebarSection>
    </SidebarShell>
  ),
};
