import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ReactFlow, ReactFlowProvider } from '@xyflow/react';

import { ZoomSelect } from './zoom-select';

const meta = {
  component: ZoomSelect,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ReactFlowProvider>
        <Story />
      </ReactFlowProvider>
    ),
  ],
} satisfies Meta<typeof ZoomSelect>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: 'Zoom select control',
  render: () => (
    <div style={{ width: 700, height: 400 }}>
      <ReactFlow
        nodes={[
          { id: '1', position: { x: 200, y: 150 }, data: { label: 'Node A' } },
          { id: '2', position: { x: 400, y: 150 }, data: { label: 'Node B' } },
        ]}
        edges={[{ id: 'e1', source: '1', target: '2' }]}
        fitView
      >
        <ZoomSelect position="bottom-center" />
      </ReactFlow>
    </div>
  ),
};

export const TopLeft: Story = {
  name: 'Positioned top-left',
  render: () => (
    <div style={{ width: 700, height: 400 }}>
      <ReactFlow
        nodes={[{ id: '1', position: { x: 300, y: 150 }, data: { label: 'Node' } }]}
        edges={[]}
        fitView
      >
        <ZoomSelect position="top-left" />
      </ReactFlow>
    </div>
  ),
};
