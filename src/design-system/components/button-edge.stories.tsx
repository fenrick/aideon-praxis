import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ReactFlow, ReactFlowProvider } from '@xyflow/react';
import { Plus, Trash2 } from 'lucide-react';

import { ButtonEdge } from './button-edge';

const meta = {
  component: ButtonEdge,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ReactFlowProvider>
        <Story />
      </ReactFlowProvider>
    ),
  ],
} satisfies Meta<typeof ButtonEdge>;

export default meta;

type Story = StoryObj<typeof meta>;

const baseNodes = [
  { id: 'source', position: { x: 80, y: 120 }, data: { label: 'Source' } },
  { id: 'target', position: { x: 420, y: 120 }, data: { label: 'Target' } },
];

const addButtonEdgeTypes = {
  buttonEdge: (props: Parameters<typeof ButtonEdge>[0]) => (
    <ButtonEdge {...props}>
      <button
        type="button"
        className="flex h-6 w-6 items-center justify-center rounded-full bg-background border shadow hover:bg-secondary"
        onClick={() => alert('Add node')}
      >
        <Plus className="h-3 w-3" />
      </button>
    </ButtonEdge>
  ),
};

export const AddButton: Story = {
  name: 'Add node button on edge',
  render: () => (
    <div style={{ width: 700, height: 300 }}>
      <ReactFlow
        nodes={baseNodes}
        edges={[{ id: 'e1', source: 'source', target: 'target', type: 'buttonEdge' }]}
        edgeTypes={addButtonEdgeTypes}
        fitView
      />
    </div>
  ),
};

const deleteButtonEdgeTypes = {
  deleteEdge: (props: Parameters<typeof ButtonEdge>[0]) => (
    <ButtonEdge {...props}>
      <button
        type="button"
        className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow hover:opacity-80"
        onClick={() => alert('Delete edge')}
      >
        <Trash2 className="h-2.5 w-2.5" />
      </button>
    </ButtonEdge>
  ),
};

export const DeleteButton: Story = {
  name: 'Delete edge button',
  render: () => (
    <div style={{ width: 700, height: 300 }}>
      <ReactFlow
        nodes={baseNodes}
        edges={[{ id: 'e1', source: 'source', target: 'target', type: 'deleteEdge' }]}
        edgeTypes={deleteButtonEdgeTypes}
        fitView
      />
    </div>
  ),
};
