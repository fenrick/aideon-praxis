import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ReactFlow, ReactFlowProvider } from '@xyflow/react';

import { NodeSearch, NodeSearchDialog } from './node-search';
import { useState } from 'react';

const meta = {
  component: NodeSearch,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ReactFlowProvider>
        <Story />
      </ReactFlowProvider>
    ),
  ],
} satisfies Meta<typeof NodeSearch>;

export default meta;

type Story = StoryObj<typeof meta>;

const mockNodes = [
  { id: '1', data: { label: 'Capability A' }, position: { x: 0, y: 0 }, type: 'default' },
  { id: '2', data: { label: 'Capability B' }, position: { x: 200, y: 0 }, type: 'default' },
  { id: '3', data: { label: 'Service Gateway' }, position: { x: 0, y: 150 }, type: 'default' },
  { id: '4', data: { label: 'Data Store' }, position: { x: 200, y: 150 }, type: 'default' },
];

export const InCanvas: Story = {
  name: 'NodeSearch in canvas panel',
  render: () => (
    <div style={{ width: 700, height: 350 }}>
      <ReactFlow
        nodes={mockNodes}
        edges={[]}
        fitView
      >
        <div className="absolute top-2 left-2 z-10">
          <NodeSearch />
        </div>
      </ReactFlow>
    </div>
  ),
};

function DialogDemo() {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ width: 700, height: 350 }}>
      <ReactFlow nodes={mockNodes} edges={[]} fitView>
        <div className="absolute top-2 left-2 z-10">
          <button
            type="button"
            className="rounded border bg-background px-3 py-1.5 text-sm shadow"
            onClick={() => setOpen(true)}
          >
            Open search dialog
          </button>
        </div>
        <NodeSearchDialog
          open={open}
          onOpenChange={setOpen}
          title="Find a node"
        />
      </ReactFlow>
    </div>
  );
}

export const Dialog: Story = {
  name: 'NodeSearchDialog',
  render: () => <DialogDemo />,
};
