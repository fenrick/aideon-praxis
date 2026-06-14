import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ReactFlow, ReactFlowProvider } from '@xyflow/react';

import { DataEdge } from './data-edge';

const meta = {
  component: DataEdge,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ReactFlowProvider>
        <Story />
      </ReactFlowProvider>
    ),
  ],
} satisfies Meta<typeof DataEdge>;

export default meta;

type Story = StoryObj<typeof meta>;

const edgeTypes = { dataEdge: DataEdge };

const baseNodes = [
  {
    id: 'source',
    position: { x: 80, y: 120 },
    data: { label: 'Sensor A', status: 'active', count: 42 },
  },
  { id: 'target', position: { x: 420, y: 120 }, data: { label: 'Processor' } },
];

export const WithKey: Story = {
  name: 'Show source data key on edge',
  render: () => (
    <div style={{ width: 700, height: 300 }}>
      <ReactFlow
        nodes={baseNodes}
        edges={[{ id: 'e1', source: 'source', target: 'target', type: 'dataEdge', data: { key: 'status', path: 'bezier' } }]}
        edgeTypes={edgeTypes}
        fitView
      />
    </div>
  ),
};

export const NumericKey: Story = {
  name: 'Show numeric data key',
  render: () => (
    <div style={{ width: 700, height: 300 }}>
      <ReactFlow
        nodes={baseNodes}
        edges={[{ id: 'e1', source: 'source', target: 'target', type: 'dataEdge', data: { key: 'count', path: 'bezier' } }]}
        edgeTypes={edgeTypes}
        fitView
      />
    </div>
  ),
};

export const NoKey: Story = {
  name: 'No key (plain edge)',
  render: () => (
    <div style={{ width: 700, height: 300 }}>
      <ReactFlow
        nodes={baseNodes}
        edges={[{ id: 'e1', source: 'source', target: 'target', type: 'dataEdge', data: { path: 'bezier' } }]}
        edgeTypes={edgeTypes}
        fitView
      />
    </div>
  ),
};

export const SmoothstepPath: Story = {
  name: 'Smoothstep path variant',
  render: () => (
    <div style={{ width: 700, height: 300 }}>
      <ReactFlow
        nodes={baseNodes}
        edges={[{ id: 'e1', source: 'source', target: 'target', type: 'dataEdge', data: { key: 'status', path: 'smoothstep' } }]}
        edgeTypes={edgeTypes}
        fitView
      />
    </div>
  ),
};
