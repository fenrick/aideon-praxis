import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Position } from '@xyflow/react';
import { ReactFlow, ReactFlowProvider } from '@xyflow/react';

import { LabeledHandle } from './labeled-handle';
import { BaseNode, BaseNodeContent, BaseNodeHeader, BaseNodeHeaderTitle } from './base-node';

const meta = {
  component: LabeledHandle,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ReactFlowProvider>
        <Story />
      </ReactFlowProvider>
    ),
  ],
} satisfies Meta<typeof LabeledHandle>;

export default meta;

type Story = StoryObj<typeof meta>;

const leftRightNodeTypes = {
  labeledHandleNode: () => (
    <BaseNode className="w-52">
      <BaseNodeHeader>
        <BaseNodeHeaderTitle>Transformer</BaseNodeHeaderTitle>
      </BaseNodeHeader>
      <BaseNodeContent>
        <LabeledHandle type="target" position={Position.Left} title="Input" id="input" />
        <LabeledHandle type="source" position={Position.Right} title="Output" id="output" />
      </BaseNodeContent>
    </BaseNode>
  ),
};

export const LeftRight: Story = {
  name: 'Input (left) and Output (right)',
  render: () => (
    <div style={{ width: 600, height: 200 }}>
      <ReactFlow
        nodes={[{ id: '1', type: 'labeledHandleNode', position: { x: 150, y: 50 }, data: {} }]}
        edges={[]}
        nodeTypes={leftRightNodeTypes}
        fitView
      />
    </div>
  ),
};

const multipleHandlesNodeTypes = {
  multiHandle: () => (
    <BaseNode className="w-52">
      <BaseNodeHeader>
        <BaseNodeHeaderTitle>Multi-port Node</BaseNodeHeaderTitle>
      </BaseNodeHeader>
      <BaseNodeContent>
        <LabeledHandle type="target" position={Position.Left} title="Stream A" id="streamA" />
        <LabeledHandle type="target" position={Position.Left} title="Stream B" id="streamB" />
        <LabeledHandle type="source" position={Position.Right} title="Result" id="result" />
      </BaseNodeContent>
    </BaseNode>
  ),
};

export const MultipleHandles: Story = {
  name: 'Multiple labeled handles',
  render: () => (
    <div style={{ width: 600, height: 220 }}>
      <ReactFlow
        nodes={[{ id: '1', type: 'multiHandle', position: { x: 150, y: 50 }, data: {} }]}
        edges={[]}
        nodeTypes={multipleHandlesNodeTypes}
        fitView
      />
    </div>
  ),
};
