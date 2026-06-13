import type { Meta, StoryObj } from '@storybook/nextjs';

import type { ProvenanceClassification } from './provenance-badge';
import { ProvenanceBadge } from './provenance-badge';

const meta: Meta<typeof ProvenanceBadge> = {
  title: 'Design System/Blocks/ProvenanceBadge',
  component: ProvenanceBadge,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Classifies content as Asserted (human-authored), Inferred (system-derived from the twin), or Generated (AI-produced). Each classification uses a distinct icon AND colour so meaning is never conveyed by colour alone (WCAG 1.4.1). Use this badge wherever the origin of a value changes how the reader should interpret or act on it.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof ProvenanceBadge>;

export const Asserted: Story = {
  args: { classification: 'asserted' },
  parameters: {
    docs: {
      description: {
        story: 'Human-authored content. The Pencil icon signals manual entry. Use where the user or an operator explicitly set the value.',
      },
    },
  },
};

export const Inferred: Story = {
  args: { classification: 'inferred' },
  parameters: {
    docs: {
      description: {
        story: 'System-derived content. The CircleDot icon signals algorithmic derivation. Use where the engine computed the value from the digital twin.',
      },
    },
  },
};

export const Generated: Story = {
  args: { classification: 'generated' },
  parameters: {
    docs: {
      description: {
        story: 'AI-produced content. The Sparkles icon signals generative origin. Use wherever a language model or generative process produced the value.',
      },
    },
  },
};

export const AllClassifications: Story = {
  name: 'All classifications',
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
