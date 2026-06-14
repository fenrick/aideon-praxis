import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Label } from './label';

const meta = {
  component: Label,
  tags: ['autodocs'],
} satisfies Meta<typeof Label>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Email address',
  },
};

export const WithHtmlFor: Story = {
  render: () => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="email-input">Email address</Label>
      <input
        id="email-input"
        type="email"
        placeholder="you@example.com"
        className="rounded-2xl border border-input bg-input/50 px-3 py-1.5 text-sm"
      />
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="group flex flex-col gap-1.5" data-disabled="true">
      <Label>Disabled label</Label>
    </div>
  ),
};
