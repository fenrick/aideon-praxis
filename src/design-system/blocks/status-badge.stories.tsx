import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';

import type { SemanticStateTone } from '../foundations/semantic-states';
import { StatusBadge } from './status-badge';

const meta = {
  component: StatusBadge,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Generic status badge backed by the semantic-state contract. Always pairs colour with an icon and label for WCAG 1.4.1 colour independence.',
      },
    },
  },
} satisfies Meta<typeof StatusBadge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ErrorState: Story = { args: { tone: 'error', label: 'Error' } };
export const Warning: Story = { args: { tone: 'warning', label: 'Warning' } };
export const Info: Story = { args: { tone: 'info', label: 'Info' } };
export const Partial: Story = { args: { tone: 'partial', label: 'Partial' } };
export const Stale: Story = { args: { tone: 'stale', label: 'Stale' } };
export const Success: Story = { args: { tone: 'success', label: 'Success' } };

export const AllTones: Story = {
  name: 'All tones',
  args: { tone: 'error', label: '' },
  render: () => {
    const tones: SemanticStateTone[] = ['error', 'warning', 'info', 'partial', 'stale', 'success'];
    return (
      <div className="flex flex-wrap gap-2">
        {tones.map((tone) => (
          <StatusBadge key={tone} label={tone} tone={tone} />
        ))}
      </div>
    );
  },
};

export const CssCheck: Story = {
  name: 'CssCheck — Tailwind classes applied',
  args: { tone: 'error', label: 'Error' },
  play: async ({ canvas }) => {
    const label = canvas.getByText('Error');
    const badge = label.parentElement;
    await expect(badge?.classList.contains('rounded-full')).toBe(true);
  },
};
