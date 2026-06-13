import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import type { ProvenanceClassification } from './provenance-badge';
import { ProvenanceBadge } from './provenance-badge';

const meta = {
  component: ProvenanceBadge,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Classifies content as Asserted, Inferred, or Generated. Each uses a distinct icon AND colour (WCAG 1.4.1).',
      },
    },
  },
} satisfies Meta<typeof ProvenanceBadge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Asserted: Story = { args: { classification: 'asserted' } };
export const Inferred: Story = { args: { classification: 'inferred' } };
export const Generated: Story = { args: { classification: 'generated' } };

export const AllClassifications: Story = {
  name: 'All classifications',
  args: { classification: 'asserted' },
  render: () => {
    const classifications: ProvenanceClassification[] = ['asserted', 'inferred', 'generated'];
    return (
      <div className="flex flex-wrap gap-2">
        {classifications.map((c) => (
          <ProvenanceBadge classification={c} key={c} />
        ))}
      </div>
    );
  },
};
