import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { CommandPalette } from './command-palette';

const meta = {
  component: CommandPalette,
  tags: ['autodocs'],
  args: {
    onOpenChange: fn(),
  },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof CommandPalette>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Open: Story = {
  name: 'Open with grouped items',
  args: {
    open: true,
    items: [
      { id: 'new-node', label: 'New node', group: 'Graph', onSelect: fn() },
      { id: 'delete', label: 'Delete selected', group: 'Graph', shortcut: '⌘⌫', onSelect: fn() },
      { id: 'diff', label: 'Show diff', group: 'Graph', shortcut: '⌘D', onSelect: fn() },
      { id: 'settings', label: 'Settings', group: 'App', onSelect: fn() },
      { id: 'theme', label: 'Toggle theme', group: 'App', shortcut: '⌘T', onSelect: fn() },
    ],
  },
};

export const WithDisabled: Story = {
  name: 'With disabled item',
  args: {
    open: true,
    items: [
      { id: 'export', label: 'Export snapshot', onSelect: fn() },
      { id: 'export-pdf', label: 'Export as PDF (unavailable)', disabled: true, onSelect: fn() },
    ],
  },
};

export const Empty: Story = {
  name: 'Empty results',
  args: {
    open: true,
    items: [],
    emptyMessage: 'No commands available.',
  },
};

export const SelectItem: Story = {
  name: 'Select item fires callback',
  args: {
    open: true,
    items: [{ id: 'action', label: 'Run action', onSelect: fn() }],
  },
  play: async ({ args }) => {
    const body = within(document.body);
    const item = await body.findByText('Run action');
    await userEvent.click(item);
    await expect(args.items[0]?.onSelect).toHaveBeenCalled();
  },
};
