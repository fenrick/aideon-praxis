import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { ProvenancePanel } from './provenance-panel';

const meta = {
  component: ProvenancePanel,
  tags: ['autodocs'],
} satisfies Meta<typeof ProvenancePanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Asserted: Story = {
  args: {
    classification: 'asserted',
    source: 'CMDB import v2.1',
  },
};

export const Inferred: Story = {
  args: {
    classification: 'inferred',
    source: 'Twin engine v2.1',
    detail: 'Inferred from network topology and last-seen telemetry over a 90-day window.',
  },
};

export const Generated: Story = {
  args: {
    classification: 'generated',
    source: 'Analytics worker',
    detail: 'Cost model generated from TCO formula applied to compute and storage metrics.',
  },
};

export const NoSource: Story = {
  name: 'No source',
  args: {
    classification: 'asserted',
  },
};

export const AllClassifications = {
  name: 'All classifications',
  render: () => (
    <div className="flex w-72 flex-col gap-3">
      <ProvenancePanel classification="asserted" source="CMDB" />
      <ProvenancePanel
        classification="inferred"
        source="Twin engine"
        detail="Derived from telemetry."
      />
      <ProvenancePanel classification="generated" source="Analytics worker" />
    </div>
  ),
};
