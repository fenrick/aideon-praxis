import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { DiffMarker } from './diff-marker';

const meta = {
  component: DiffMarker,
  tags: ['autodocs'],
} satisfies Meta<typeof DiffMarker>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Added: Story = { args: { operation: 'added' } };
export const Changed: Story = { args: { operation: 'changed' } };
export const Removed: Story = { args: { operation: 'removed' } };
export const Unchanged: Story = { args: { operation: 'unchanged' } };

export const AllOperations: Story = {
  name: 'All operations',
  args: { operation: 'added' },
  render: () => (
    <div className="flex flex-col gap-2">
      {(['added', 'changed', 'removed', 'unchanged'] as const).map((op) => (
        <div className="flex items-center gap-4" key={op}>
          <DiffMarker operation={op} />
          <span className="text-muted-foreground text-xs">
            {op === 'added' && 'New node in the target plateau'}
            {op === 'changed' && 'Property value differs between plateaus'}
            {op === 'removed' && 'Node absent in the target plateau'}
            {op === 'unchanged' && 'Identical in both plateaus'}
          </span>
        </div>
      ))}
    </div>
  ),
};
