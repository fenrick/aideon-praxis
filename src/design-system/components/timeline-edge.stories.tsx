import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ReactFlow, ReactFlowProvider } from '@xyflow/react';

import { TimelineEdge } from './timeline-edge';

const meta = {
  component: TimelineEdge,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ReactFlowProvider>
        <Story />
      </ReactFlowProvider>
    ),
  ],
} satisfies Meta<typeof TimelineEdge>;

export default meta;

type Story = StoryObj<typeof meta>;

const edgeTypes = { timeline: TimelineEdge };

const baseNodes = [
  { id: 'a', position: { x: 80, y: 120 }, data: { label: 'Start' } },
  { id: 'b', position: { x: 420, y: 120 }, data: { label: 'End' } },
];

export const NoLabel: Story = {
  name: 'Timeline edge — no label',
  render: () => (
    <div style={{ width: 700, height: 300 }}>
      <ReactFlow
        nodes={baseNodes}
        edges={[{ id: 'e1', source: 'a', target: 'b', type: 'timeline' }]}
        edgeTypes={edgeTypes}
        fitView
      />
    </div>
  ),
};

export const WithLabel: Story = {
  name: 'Timeline edge — with label',
  render: () => (
    <div style={{ width: 700, height: 300 }}>
      <ReactFlow
        nodes={baseNodes}
        edges={[
          {
            id: 'e1',
            source: 'a',
            target: 'b',
            type: 'timeline',
            data: { label: 'Q1 2025' },
          },
        ]}
        edgeTypes={edgeTypes}
        fitView
      />
    </div>
  ),
};

export const MultipleEdges: Story = {
  name: 'Multiple timeline edges',
  render: () => (
    <div style={{ width: 700, height: 350 }}>
      <ReactFlow
        nodes={[
          { id: 'a', position: { x: 60, y: 50 }, data: { label: 'Alpha' } },
          { id: 'b', position: { x: 320, y: 50 }, data: { label: 'Beta' } },
          { id: 'c', position: { x: 320, y: 200 }, data: { label: 'Gamma' } },
        ]}
        edges={[
          { id: 'e1', source: 'a', target: 'b', type: 'timeline', data: { label: 'Phase 1' } },
          { id: 'e2', source: 'a', target: 'c', type: 'timeline', data: { label: 'Phase 2' } },
        ]}
        edgeTypes={edgeTypes}
        fitView
      />
    </div>
  ),
};
