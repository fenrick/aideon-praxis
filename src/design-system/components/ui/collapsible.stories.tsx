import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import * as React from 'react';
import { userEvent, within, expect } from 'storybook/test';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from './collapsible';
import { Button } from './button';

const meta = {
  component: Collapsible,
  tags: ['autodocs'],
} satisfies Meta<typeof Collapsible>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    const [open, setOpen] = React.useState(false);
    return (
      <Collapsible open={open} onOpenChange={setOpen} className="w-72">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Repositories</span>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon-sm">
              {open ? '▲' : '▼'}
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="mt-2 space-y-1">
          <div className="rounded-lg border px-3 py-2 text-sm">aideon-desktop</div>
          <div className="rounded-lg border px-3 py-2 text-sm">aideon-server</div>
        </CollapsibleContent>
      </Collapsible>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button');
    await userEvent.click(trigger);
    await expect(canvas.getByText('aideon-desktop')).toBeInTheDocument();
  },
};

export const DefaultOpen: Story = {
  render: () => (
    <Collapsible defaultOpen className="w-72">
      <CollapsibleTrigger asChild>
        <Button variant="outline" className="w-full justify-start">
          Toggle content
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 rounded-lg border px-3 py-2 text-sm">
        This content is visible by default.
      </CollapsibleContent>
    </Collapsible>
  ),
};
