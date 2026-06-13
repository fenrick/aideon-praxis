import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ScrollArea, ScrollBar } from './scroll-area';

const meta = {
  component: ScrollArea,
  tags: ['autodocs'],
} satisfies Meta<typeof ScrollArea>;
export default meta;
type Story = StoryObj<typeof meta>;

const tags = Array.from({ length: 30 }, (_, i) => `Tag ${i + 1}`);

export const Vertical: Story = {
  render: () => (
    <ScrollArea className="h-48 w-64 rounded-2xl border p-3">
      <div className="flex flex-col gap-2">
        {tags.map((tag) => (
          <div key={tag} className="rounded-xl border px-3 py-1.5 text-sm">
            {tag}
          </div>
        ))}
      </div>
    </ScrollArea>
  ),
};

export const Horizontal: Story = {
  render: () => (
    <ScrollArea className="w-64 rounded-2xl border p-3">
      <div className="flex gap-2">
        {tags.map((tag) => (
          <div key={tag} className="shrink-0 rounded-xl border px-3 py-1.5 text-sm whitespace-nowrap">
            {tag}
          </div>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  ),
};
