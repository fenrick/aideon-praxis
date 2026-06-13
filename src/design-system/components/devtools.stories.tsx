import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ReactFlow, ReactFlowProvider } from '@xyflow/react';

import { DevTools } from './devtools';

const meta = {
  component: DevTools,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ReactFlowProvider>
        <Story />
      </ReactFlowProvider>
    ),
  ],
} satisfies Meta<typeof DevTools>;

export default meta;

type Story = StoryObj<typeof meta>;

const sampleNodes = [
  { id: '1', position: { x: 100, y: 80 }, data: { label: 'Node A' } },
  { id: '2', position: { x: 360, y: 80 }, data: { label: 'Node B' } },
  { id: '3', position: { x: 230, y: 220 }, data: { label: 'Node C' } },
];

const sampleEdges = [
  { id: 'e1', source: '1', target: '2' },
  { id: 'e2', source: '2', target: '3' },
];

export const BottomRight: Story = {
  name: 'DevTools panel — bottom-right',
  render: () => (
    <div style={{ width: 700, height: 400 }}>
      <ReactFlow nodes={sampleNodes} edges={sampleEdges} fitView>
        <DevTools position="bottom-right" />
      </ReactFlow>
    </div>
  ),
};

export const TopRight: Story = {
  name: 'DevTools panel — top-right',
  render: () => (
    <div style={{ width: 700, height: 400 }}>
      <ReactFlow nodes={sampleNodes} edges={sampleEdges} fitView>
        <DevTools position="top-right" />
      </ReactFlow>
    </div>
  ),
};
