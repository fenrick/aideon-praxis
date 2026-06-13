import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Position } from '@xyflow/react';
import { ReactFlow, ReactFlowProvider } from '@xyflow/react';

import { NodeTooltip, NodeTooltipContent, NodeTooltipTrigger } from './node-tooltip';
import { BaseNode, BaseNodeContent, BaseNodeHeader, BaseNodeHeaderTitle } from './base-node';

const meta = {
  component: NodeTooltip,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ReactFlowProvider>
        <Story />
      </ReactFlowProvider>
    ),
  ],
} satisfies Meta<typeof NodeTooltip>;

export default meta;

type Story = StoryObj<typeof meta>;

const tooltipNodeTypes = {
  tooltipNode: () => (
    <NodeTooltip>
      <NodeTooltipContent position={Position.Top}>
        Hover to see this tooltip
      </NodeTooltipContent>
      <NodeTooltipTrigger>
        <BaseNode className="w-48">
          <BaseNodeHeader>
            <BaseNodeHeaderTitle>Hover me</BaseNodeHeaderTitle>
          </BaseNodeHeader>
          <BaseNodeContent>
            <p className="text-muted-foreground text-xs">Move the mouse over the node.</p>
          </BaseNodeContent>
        </BaseNode>
      </NodeTooltipTrigger>
    </NodeTooltip>
  ),
};

export const Default: Story = {
  name: 'Tooltip on hover',
  render: () => (
    <div style={{ width: 600, height: 300 }}>
      <ReactFlow
        nodes={[{ id: '1', type: 'tooltipNode', position: { x: 150, y: 100 }, data: {} }]}
        edges={[]}
        nodeTypes={tooltipNodeTypes}
        fitView
      />
    </div>
  ),
};

const bottomTooltipNodeTypes = {
  bottomTooltipNode: () => (
    <NodeTooltip>
      <NodeTooltipContent position={Position.Bottom}>
        Details about this node
      </NodeTooltipContent>
      <NodeTooltipTrigger>
        <BaseNode className="w-48">
          <BaseNodeHeader>
            <BaseNodeHeaderTitle>Node</BaseNodeHeaderTitle>
          </BaseNodeHeader>
        </BaseNode>
      </NodeTooltipTrigger>
    </NodeTooltip>
  ),
};

export const BottomPosition: Story = {
  name: 'Tooltip at bottom',
  render: () => (
    <div style={{ width: 600, height: 300 }}>
      <ReactFlow
        nodes={[{ id: '1', type: 'bottomTooltipNode', position: { x: 150, y: 100 }, data: {} }]}
        edges={[]}
        nodeTypes={bottomTooltipNodeTypes}
        fitView
      />
    </div>
  ),
};
