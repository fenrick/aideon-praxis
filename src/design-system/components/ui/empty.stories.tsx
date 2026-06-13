import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent, EmptyMedia } from './empty';
import { Button } from './button';
import { InboxIcon } from 'lucide-react';

const meta = {
  component: Empty,
  tags: ['autodocs'],
} satisfies Meta<typeof Empty>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>No items yet</EmptyTitle>
        <EmptyDescription>
          Get started by creating your first item.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button>Create item</Button>
      </EmptyContent>
    </Empty>
  ),
};

export const WithIcon: Story = {
  render: () => (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <InboxIcon />
        </EmptyMedia>
        <EmptyTitle>No messages</EmptyTitle>
        <EmptyDescription>
          Your inbox is empty. Messages will appear here when you receive them.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  ),
};

export const WithoutContent: Story = {
  render: () => (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>Nothing to show</EmptyTitle>
        <EmptyDescription>Try adjusting your filters.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  ),
};
