import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Position } from '@xyflow/react';
import { ReactFlow, ReactFlowProvider } from '@xyflow/react';

import { BaseHandle } from './base-handle';
import { BaseNode, BaseNodeContent, BaseNodeHeader, BaseNodeHeaderTitle } from './base-node';

const meta = {
  component: BaseHandle,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ReactFlowProvider>
        <Story />
      </ReactFlowProvider>
    ),
  ],
} satisfies Meta<typeof BaseHandle>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Handles must be rendered inside a ReactFlow node context to function.
 *  These stories embed them inside a minimal ReactFlow canvas. */

const nodeTypes = {
  handleDemo: () => (
    <BaseNode className="w-48">
      <BaseHandle type="target" position={Position.Left} id="target" />
      <BaseNodeHeader>
        <BaseNodeHeaderTitle>Node</BaseNodeHeaderTitle>
      </BaseNodeHeader>
      <BaseNodeContent>
        <p className="text-muted-foreground text-xs">Both handles visible.</p>
      </BaseNodeContent>
      <BaseHandle type="source" position={Position.Right} id="source" />
    </BaseNode>
  ),
};

export const Default: Story = {
  name: 'Source and target handles',
  render: () => (
    <div style={{ width: 500, height: 200 }}>
      <ReactFlow
        nodes={[{ id: '1', type: 'handleDemo', position: { x: 120, y: 40 }, data: {} }]}
        edges={[]}
        nodeTypes={nodeTypes}
        fitView
      />
    </div>
  ),
};

const allPositionsNodeTypes = {
  allPositions: () => (
    <BaseNode className="w-40">
      <BaseHandle type="target" position={Position.Top} id="top" />
      <BaseHandle type="source" position={Position.Bottom} id="bottom" />
      <BaseHandle type="target" position={Position.Left} id="left" />
      <BaseHandle type="source" position={Position.Right} id="right" />
      <BaseNodeContent>
        <p className="text-muted-foreground text-xs text-center">All positions</p>
      </BaseNodeContent>
    </BaseNode>
  ),
};

export const AllPositions: Story = {
  name: 'All handle positions',
  render: () => (
    <div style={{ width: 500, height: 200 }}>
      <ReactFlow
        nodes={[{ id: '1', type: 'allPositions', position: { x: 160, y: 50 }, data: {} }]}
        edges={[]}
        nodeTypes={allPositionsNodeTypes}
        fitView
      />
    </div>
  ),
};
