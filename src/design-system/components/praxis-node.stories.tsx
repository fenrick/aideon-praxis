import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ReactFlow, ReactFlowProvider } from '@xyflow/react';

import { PraxisNode, type PraxisNodeType } from './praxis-node';

const meta = {
  component: PraxisNode,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ReactFlowProvider>
        <Story />
      </ReactFlowProvider>
    ),
  ],
} satisfies Meta<typeof PraxisNode>;

export default meta;

type Story = StoryObj<typeof meta>;

const nodeTypes = { 'praxis-node': PraxisNode };

function makeNode(overrides: Partial<PraxisNodeType> = {}): PraxisNodeType {
  return {
    id: '1',
    type: 'praxis-node',
    position: { x: 100, y: 80 },
    data: { label: 'Capability A', typeLabel: 'Capability', meta: 'Platform infrastructure' },
    ...overrides,
  };
}

export const Default: Story = {
  name: 'Default node',
  render: () => (
    <div style={{ width: 600, height: 250 }}>
      <ReactFlow
        nodes={[makeNode()]}
        edges={[]}
        nodeTypes={nodeTypes}
        fitView
      />
    </div>
  ),
};

export const LabelOnly: Story = {
  name: 'Label only',
  render: () => (
    <div style={{ width: 600, height: 250 }}>
      <ReactFlow
        nodes={[makeNode({ data: { label: 'Simple Node' } })]}
        edges={[]}
        nodeTypes={nodeTypes}
        fitView
      />
    </div>
  ),
};

export const WithMeta: Story = {
  name: 'With meta description',
  render: () => (
    <div style={{ width: 600, height: 250 }}>
      <ReactFlow
        nodes={[
          makeNode({
            data: {
              label: 'Data Store',
              typeLabel: 'Storage',
              meta: 'PostgreSQL 15 · prod-db-01',
            },
          }),
        ]}
        edges={[]}
        nodeTypes={nodeTypes}
        fitView
      />
    </div>
  ),
};

export const Connected: Story = {
  name: 'Two connected nodes',
  render: () => (
    <div style={{ width: 700, height: 250 }}>
      <ReactFlow
        nodes={[
          makeNode({ id: 'a', position: { x: 60, y: 80 }, data: { label: 'Source', typeLabel: 'Service' } }),
          makeNode({ id: 'b', position: { x: 380, y: 80 }, data: { label: 'Target', typeLabel: 'Database' } }),
        ]}
        edges={[{ id: 'e1', source: 'a', target: 'b' }]}
        nodeTypes={nodeTypes}
        fitView
      />
    </div>
  ),
};
