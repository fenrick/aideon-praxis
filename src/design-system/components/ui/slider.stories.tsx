import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Slider } from './slider';

const meta = {
  component: Slider,
  tags: ['autodocs'],
} satisfies Meta<typeof Slider>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { defaultValue: [50], max: 100 },
  render: (args) => (
    <div className="w-80">
      <Slider {...args} />
    </div>
  ),
};

export const Range: Story = {
  args: { defaultValue: [25, 75], max: 100 },
  render: (args) => (
    <div className="w-80">
      <Slider {...args} />
    </div>
  ),
};

export const Disabled: Story = {
  args: { defaultValue: [40], max: 100, disabled: true },
  render: (args) => (
    <div className="w-80">
      <Slider {...args} />
    </div>
  ),
};
