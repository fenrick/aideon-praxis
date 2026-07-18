import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import type { SelectionProperties } from 'praxis/stores/selection-store';

import { InspectorContent, InspectorEmpty } from './platform-inspector';

const nodeProperties: SelectionProperties = {
  name: 'Customer Portal',
  description: 'Self-service portal for retail customers.',
  dataSource: 'CRM',
  type: 'Application',
};

const noop = fn();

const meta = {
  component: InspectorContent,
  parameters: { layout: 'padded' },
  args: {
    selectionId: 'node-customer-portal',
    selectionKind: 'node',
    properties: nodeProperties,
    saving: false,
    reloadTick: 0,
    onSave: noop,
    onReset: noop,
  },
  render: (properties) => (
    <div className="h-[560px] w-80">
      <InspectorContent {...properties} />
    </div>
  ),
} satisfies Meta<typeof InspectorContent>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Selected: Story = {};

export const Saving: Story = {
  args: {
    saving: true,
  },
};

export const SaveError: Story = {
  name: 'Save error',
  args: {
    error: 'The host rejected the change: name must be unique.',
  },
};

export const Empty: Story = {
  render: () => (
    <div className="h-[560px] w-80">
      <InspectorEmpty />
    </div>
  ),
};
