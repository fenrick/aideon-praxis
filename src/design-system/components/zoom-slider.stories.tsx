import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ReactFlow, ReactFlowProvider } from '@xyflow/react';

import { ZoomSlider } from './zoom-slider';

const meta = {
  component: ZoomSlider,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ReactFlowProvider>
        <Story />
      </ReactFlowProvider>
    ),
  ],
} satisfies Meta<typeof ZoomSlider>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  name: 'Horizontal zoom slider',
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
        <ZoomSlider position="bottom-center" orientation="horizontal" />
      </ReactFlow>
    </div>
  ),
};

export const Vertical: Story = {
  name: 'Vertical zoom slider',
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
        <ZoomSlider position="bottom-right" orientation="vertical" />
      </ReactFlow>
    </div>
  ),
};
