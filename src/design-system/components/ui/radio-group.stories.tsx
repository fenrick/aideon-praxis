import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Label } from './label';
import { RadioGroup, RadioGroupItem } from './radio-group';

const meta = {
  component: RadioGroup,
  tags: ['autodocs'],
} satisfies Meta<typeof RadioGroup>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <RadioGroup defaultValue="option-a">
      <div className="flex items-center gap-2">
        <RadioGroupItem value="option-a" id="option-a" />
        <Label htmlFor="option-a">Option A</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="option-b" id="option-b" />
        <Label htmlFor="option-b">Option B</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="option-c" id="option-c" />
        <Label htmlFor="option-c">Option C</Label>
      </div>
    </RadioGroup>
  ),
};

export const Disabled: Story = {
  render: () => (
    <RadioGroup defaultValue="option-a">
      <div className="flex items-center gap-2">
        <RadioGroupItem value="option-a" id="disabled-a" />
        <Label htmlFor="disabled-a">Enabled</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="option-b" id="disabled-b" disabled />
        <Label htmlFor="disabled-b">Disabled</Label>
      </div>
    </RadioGroup>
  ),
};
