import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { DirectionProvider } from './direction';
import { Button } from './button';

const meta = {
  component: DirectionProvider,
  tags: ['autodocs'],
} satisfies Meta<typeof DirectionProvider>;
export default meta;
type Story = StoryObj<typeof meta>;

export const LeftToRight: Story = {
  render: () => (
    <DirectionProvider dir="ltr">
      <div className="flex gap-2">
        <Button>First</Button>
        <Button variant="outline">Second</Button>
      </div>
    </DirectionProvider>
  ),
};

export const RightToLeft: Story = {
  render: () => (
    <DirectionProvider dir="rtl">
      <div className="flex gap-2">
        <Button>أول</Button>
        <Button variant="outline">ثاني</Button>
      </div>
    </DirectionProvider>
  ),
};
