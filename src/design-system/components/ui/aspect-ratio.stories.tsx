import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { AspectRatio } from './aspect-ratio';

const meta = {
  component: AspectRatio,
  tags: ['autodocs'],
} satisfies Meta<typeof AspectRatio>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Sixteen9: Story = {
  render: () => (
    <div className="w-64">
      <AspectRatio ratio={16 / 9}>
        <div className="flex size-full items-center justify-center rounded-xl bg-muted text-sm text-muted-foreground">
          16 / 9
        </div>
      </AspectRatio>
    </div>
  ),
};

export const Square: Story = {
  render: () => (
    <div className="w-48">
      <AspectRatio ratio={1}>
        <div className="flex size-full items-center justify-center rounded-xl bg-muted text-sm text-muted-foreground">
          1 / 1
        </div>
      </AspectRatio>
    </div>
  ),
};

export const FourThree: Story = {
  render: () => (
    <div className="w-64">
      <AspectRatio ratio={4 / 3}>
        <div className="flex size-full items-center justify-center rounded-xl bg-muted text-sm text-muted-foreground">
          4 / 3
        </div>
      </AspectRatio>
    </div>
  ),
};
