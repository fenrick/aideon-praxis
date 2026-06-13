import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Logo } from './logo';

const meta = {
  component: Logo,
  tags: ['autodocs'],
} satisfies Meta<typeof Logo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  name: 'Horizontal lockup',
  args: {
    variant: 'horizontal',
    className: 'h-10',
  },
};

export const Vertical: Story = {
  name: 'Vertical lockup',
  args: {
    variant: 'vertical',
    className: 'h-20',
  },
};

export const HorizontalWithPlate: Story = {
  name: 'Horizontal with plate',
  render: () => (
    <div className="bg-slate-800 p-8">
      <Logo variant="horizontal" plate className="h-10" />
    </div>
  ),
};

export const VerticalWithPlate: Story = {
  name: 'Vertical with plate',
  render: () => (
    <div className="bg-slate-800 p-8">
      <Logo variant="vertical" plate className="h-20" />
    </div>
  ),
};

export const Sizes: Story = {
  name: 'Size variants',
  render: () => (
    <div className="flex flex-col gap-4 p-8">
      {(['h-6', 'h-8', 'h-10', 'h-14', 'h-20'] as const).map((size) => (
        <div key={size} className="flex items-center gap-4">
          <Logo variant="horizontal" className={size} />
          <span className="text-muted-foreground text-xs">{size}</span>
        </div>
      ))}
    </div>
  ),
};
