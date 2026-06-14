import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { BoldIcon, ItalicIcon, UnderlineIcon } from 'lucide-react';
import { Toggle } from './toggle';

const meta = {
  component: Toggle,
  tags: ['autodocs'],
} satisfies Meta<typeof Toggle>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Toggle aria-label="Bold">
      <BoldIcon />
    </Toggle>
  ),
};

export const WithText: Story = {
  render: () => (
    <Toggle aria-label="Bold">
      <BoldIcon />
      Bold
    </Toggle>
  ),
};

export const Outline: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Toggle variant="outline" aria-label="Bold">
        <BoldIcon />
      </Toggle>
      <Toggle variant="outline" aria-label="Italic" defaultPressed>
        <ItalicIcon />
      </Toggle>
      <Toggle variant="outline" aria-label="Underline">
        <UnderlineIcon />
      </Toggle>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Toggle size="sm" aria-label="Small">
        <BoldIcon />
      </Toggle>
      <Toggle size="default" aria-label="Default">
        <BoldIcon />
      </Toggle>
      <Toggle size="lg" aria-label="Large">
        <BoldIcon />
      </Toggle>
    </div>
  ),
};
