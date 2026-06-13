import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { BaseNode, BaseNodeContent, BaseNodeHeader, BaseNodeHeaderTitle } from './base-node';
import { NodeStatusIndicator, type NodeStatus, type NodeStatusVariant } from './node-status-indicator';

const meta = {
  component: NodeStatusIndicator,
  tags: ['autodocs'],
} satisfies Meta<typeof NodeStatusIndicator>;

export default meta;

type Story = StoryObj<typeof meta>;

function SampleCard({ label }: { label: string }) {
  return (
    <BaseNode className="w-48">
      <BaseNodeHeader>
        <BaseNodeHeaderTitle>{label}</BaseNodeHeaderTitle>
      </BaseNodeHeader>
      <BaseNodeContent>
        <p className="text-muted-foreground text-xs">Node content.</p>
      </BaseNodeContent>
    </BaseNode>
  );
}

export const Initial: Story = {
  name: 'Initial (no indicator)',
  render: () => (
    <div className="p-8">
      <NodeStatusIndicator status="initial">
        <SampleCard label="Initial" />
      </NodeStatusIndicator>
    </div>
  ),
};

export const LoadingBorder: Story = {
  name: 'Loading — border variant',
  render: () => (
    <div className="p-8">
      <NodeStatusIndicator status="loading" variant="border">
        <SampleCard label="Processing" />
      </NodeStatusIndicator>
    </div>
  ),
};

export const LoadingOverlay: Story = {
  name: 'Loading — overlay variant',
  render: () => (
    <div className="p-8">
      <NodeStatusIndicator status="loading" variant="overlay">
        <SampleCard label="Processing" />
      </NodeStatusIndicator>
    </div>
  ),
};

export const Success: Story = {
  name: 'Success',
  render: () => (
    <div className="p-8">
      <NodeStatusIndicator status="success">
        <SampleCard label="Completed" />
      </NodeStatusIndicator>
    </div>
  ),
};

export const Error: Story = {
  name: 'Error',
  render: () => (
    <div className="p-8">
      <NodeStatusIndicator status="error">
        <SampleCard label="Failed" />
      </NodeStatusIndicator>
    </div>
  ),
};

export const AllStatuses: Story = {
  name: 'All statuses',
  render: () => {
    const statuses: Array<{ status: NodeStatus; label: string }> = [
      { status: 'initial', label: 'Initial' },
      { status: 'loading', label: 'Loading' },
      { status: 'success', label: 'Success' },
      { status: 'error', label: 'Error' },
    ];
    return (
      <div className="flex flex-wrap gap-8 p-8">
        {statuses.map(({ status, label }) => (
          <div key={status} className="flex flex-col items-center gap-2">
            <NodeStatusIndicator status={status}>
              <SampleCard label={label} />
            </NodeStatusIndicator>
            <span className="text-muted-foreground text-xs">{status}</span>
          </div>
        ))}
      </div>
    );
  },
};

export const AllVariants: Story = {
  name: 'Loading variants',
  render: () => {
    const variants: NodeStatusVariant[] = ['border', 'overlay'];
    return (
      <div className="flex flex-wrap gap-8 p-8">
        {variants.map((variant) => (
          <div key={variant} className="flex flex-col items-center gap-2">
            <NodeStatusIndicator status="loading" variant={variant}>
              <SampleCard label="Loading" />
            </NodeStatusIndicator>
            <span className="text-muted-foreground text-xs">{variant}</span>
          </div>
        ))}
      </div>
    );
  },
};
