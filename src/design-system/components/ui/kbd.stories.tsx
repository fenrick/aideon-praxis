import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { CommandIcon } from 'lucide-react';
import { Kbd, KbdGroup } from './kbd';

const meta = {
  component: Kbd,
  tags: ['autodocs'],
} satisfies Meta<typeof Kbd>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <Kbd>K</Kbd>,
};

export const WithModifier: Story = {
  render: () => (
    <KbdGroup>
      <Kbd>
        <CommandIcon />
      </Kbd>
      <Kbd>K</Kbd>
    </KbdGroup>
  ),
};

export const Combination: Story = {
  render: () => (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      Press
      <KbdGroup>
        <Kbd>
          <CommandIcon />
        </Kbd>
        <Kbd>Shift</Kbd>
        <Kbd>P</Kbd>
      </KbdGroup>
      to open the command palette.
    </div>
  ),
};
