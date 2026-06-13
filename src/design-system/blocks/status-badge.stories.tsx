import type { Meta, StoryObj } from '@storybook/nextjs';

import type { SemanticStateTone } from '../foundations/semantic-states';
import { StatusBadge } from './status-badge';

const meta: Meta<typeof StatusBadge> = {
  title: 'Design System/Blocks/StatusBadge',
  component: StatusBadge,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Generic status badge backed by the semantic-state contract. Always pairs colour with an icon and label for WCAG 1.4.1 colour independence. Use this as a building block for more specific badges like StaleBadge.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof StatusBadge>;

export const Error: Story = {
  args: { tone: 'error', label: 'Error' },
};

export const Warning: Story = {
  args: { tone: 'warning', label: 'Warning' },
};

export const Info: Story = {
  args: { tone: 'info', label: 'Info' },
};

export const Partial: Story = {
  args: { tone: 'partial', label: 'Partial' },
};

export const Stale: Story = {
  args: { tone: 'stale', label: 'Stale' },
};

export const Success: Story = {
  args: { tone: 'success', label: 'Success' },
};

export const AllTones: Story = {
  name: 'All tones',
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
  parameters: {
    docs: {
      description: {
        story: 'All six semantic tones side by side — useful for reviewing colour contrast and shape differentiation without colour alone.',
      },
    },
  },
};
