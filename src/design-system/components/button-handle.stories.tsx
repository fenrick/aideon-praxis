import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Position } from '@xyflow/react';
import { ReactFlow, ReactFlowProvider } from '@xyflow/react';
import { Plus } from 'lucide-react';

import { ButtonHandle } from './button-handle';
import { BaseNode, BaseNodeContent, BaseNodeHeader, BaseNodeHeaderTitle } from './base-node';

const meta = {
  component: ButtonHandle,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ReactFlowProvider>
        <Story />
      </ReactFlowProvider>
    ),
  ],
} satisfies Meta<typeof ButtonHandle>;

export default meta;

type Story = StoryObj<typeof meta>;

const bottomNodeTypes = {
  buttonHandleBottom: () => (
    <BaseNode className="w-48">
      <BaseNodeHeader>
        <BaseNodeHeaderTitle>Node</BaseNodeHeaderTitle>
      </BaseNodeHeader>
      <BaseNodeContent>
        <p className="text-muted-foreground text-xs">Button handle at bottom.</p>
      </BaseNodeContent>
      <ButtonHandle type="source" position={Position.Bottom} id="source">
        <button
          type="button"
          className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300"
        >
          <Plus className="h-3 w-3" />
        </button>
      </ButtonHandle>
    </BaseNode>
  ),
};

export const BottomHandle: Story = {
  name: 'Button handle — bottom',
  render: () => (
    <div style={{ width: 500, height: 250 }}>
      <ReactFlow
        nodes={[{ id: '1', type: 'buttonHandleBottom', position: { x: 120, y: 60 }, data: {} }]}
        edges={[]}
        nodeTypes={bottomNodeTypes}
        fitView
      />
    </div>
  ),
};

const rightNodeTypes = {
  buttonHandleRight: () => (
    <BaseNode className="w-48">
      <BaseNodeHeader>
        <BaseNodeHeaderTitle>Node</BaseNodeHeaderTitle>
      </BaseNodeHeader>
      <BaseNodeContent>
        <p className="text-muted-foreground text-xs">Button handle at right.</p>
      </BaseNodeContent>
      <ButtonHandle type="source" position={Position.Right} id="source">
        <button
          type="button"
          className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300"
        >
          <Plus className="h-3 w-3" />
        </button>
      </ButtonHandle>
    </BaseNode>
  ),
};

export const RightHandle: Story = {
  name: 'Button handle — right',
  render: () => (
    <div style={{ width: 500, height: 200 }}>
      <ReactFlow
        nodes={[{ id: '1', type: 'buttonHandleRight', position: { x: 80, y: 60 }, data: {} }]}
        edges={[]}
        nodeTypes={rightNodeTypes}
        fitView
      />
    </div>
  ),
};

const noButtonNodeTypes = {
  noButtonHandle: () => (
    <BaseNode className="w-48">
      <BaseNodeHeader>
        <BaseNodeHeaderTitle>Node</BaseNodeHeaderTitle>
      </BaseNodeHeader>
      <ButtonHandle type="source" position={Position.Bottom} id="source" showButton={false} />
    </BaseNode>
  ),
};

export const HiddenButton: Story = {
  name: 'Button hidden (showButton=false)',
  render: () => (
    <div style={{ width: 500, height: 200 }}>
      <ReactFlow
        nodes={[{ id: '1', type: 'noButtonHandle', position: { x: 120, y: 60 }, data: {} }]}
        edges={[]}
        nodeTypes={noButtonNodeTypes}
        fitView
      />
    </div>
  ),
};
