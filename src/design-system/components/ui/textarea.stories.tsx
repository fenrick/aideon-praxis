import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Textarea } from './textarea';

const meta = {
  component: Textarea,
  tags: ['autodocs'],
} satisfies Meta<typeof Textarea>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { placeholder: 'Type something here…' },
  render: (args) => (
    <div className="w-80">
      <Textarea {...args} />
    </div>
  ),
};

export const WithValue: Story = {
  args: { defaultValue: 'This textarea already has some content in it to show the auto-sizing behaviour.' },
  render: (args) => (
    <div className="w-80">
      <Textarea {...args} />
    </div>
  ),
};

export const Disabled: Story = {
  args: { placeholder: 'Disabled textarea', disabled: true },
  render: (args) => (
    <div className="w-80">
      <Textarea {...args} />
    </div>
  ),
};
