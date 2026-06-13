import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { HoverCard, HoverCardTrigger, HoverCardContent } from './hover-card';
import { Avatar, AvatarFallback } from './avatar';
import { Button } from './button';

const meta = {
  component: HoverCard,
  tags: ['autodocs'],
} satisfies Meta<typeof HoverCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <HoverCard>
      <HoverCardTrigger asChild>
        <Button variant="link">@aideon</Button>
      </HoverCardTrigger>
      <HoverCardContent>
        <div className="flex gap-3">
          <Avatar>
            <AvatarFallback>A</AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold">Aideon Suite</h4>
            <p className="text-sm text-muted-foreground">
              Time-first digital twin platform.
            </p>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  ),
};

export const OpenDelay: Story = {
  render: () => (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <Button variant="outline">Hover for info</Button>
      </HoverCardTrigger>
      <HoverCardContent>
        <p className="text-sm">This card appears after a short delay.</p>
      </HoverCardContent>
    </HoverCard>
  ),
};
