import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { ConfidenceLabel } from './confidence-label';
import { PropertyList } from './property-list';
import { ProvenanceBadge } from './provenance-badge';

const meta = {
  component: PropertyList,
  tags: ['autodocs'],
} satisfies Meta<typeof PropertyList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default = {
  render: () => (
    <div className="w-64">
      <PropertyList
        items={[
          {
            key: 'name',
            label: 'Name',
            value: 'Capability A',
            badge: <ProvenanceBadge classification="asserted" />,
          },
          { key: 'confidence', label: 'Confidence', value: <ConfidenceLabel tier="high" /> },
          { key: 'owner', label: 'Owner', value: 'Platform team' },
        ]}
      />
    </div>
  ),
};
