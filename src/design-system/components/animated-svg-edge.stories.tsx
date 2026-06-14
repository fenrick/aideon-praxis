import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ReactFlow, ReactFlowProvider, type Edge } from '@xyflow/react';

import { AnimatedSvgEdge, type AnimatedSvgEdge as AnimatedSvgEdgeType } from './animated-svg-edge';

const meta = {
  component: AnimatedSvgEdge,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ReactFlowProvider>
        <Story />
      </ReactFlowProvider>
    ),
  ],
} satisfies Meta<typeof AnimatedSvgEdge>;

export default meta;

type Story = StoryObj<typeof meta>;

const edgeTypes = { animatedSvg: AnimatedSvgEdge };

const baseNodes = [
  { id: 'source', position: { x: 80, y: 120 }, data: { label: 'Source' } },
  { id: 'target', position: { x: 400, y: 120 }, data: { label: 'Target' } },
];

function makeEdge(data: AnimatedSvgEdgeType['data']): Edge[] {
  return [{ id: 'e1', source: 'source', target: 'target', type: 'animatedSvg', data }];
}

export const CircleBezier: Story = {
  name: 'Circle — bezier path',
  render: () => (
    <div style={{ width: 700, height: 300 }}>
      <ReactFlow
        nodes={baseNodes}
        edges={makeEdge({ shape: 'circle', duration: 2, path: 'bezier', direction: 'forward', repeat: 'indefinite' })}
        edgeTypes={edgeTypes}
        fitView
      />
    </div>
  ),
};

export const PackageStraight: Story = {
  name: 'Package — straight path',
  render: () => (
    <div style={{ width: 700, height: 300 }}>
      <ReactFlow
        nodes={baseNodes}
        edges={makeEdge({ shape: 'package', duration: 3, path: 'straight', direction: 'forward', repeat: 'indefinite' })}
        edgeTypes={edgeTypes}
        fitView
      />
    </div>
  ),
};

export const Alternate: Story = {
  name: 'Alternating direction',
  render: () => (
    <div style={{ width: 700, height: 300 }}>
      <ReactFlow
        nodes={baseNodes}
        edges={makeEdge({ shape: 'circle', duration: 1.5, path: 'bezier', direction: 'alternate', repeat: 'indefinite' })}
        edgeTypes={edgeTypes}
        fitView
      />
    </div>
  ),
};

export const Smoothstep: Story = {
  name: 'Smoothstep path',
  render: () => (
    <div style={{ width: 700, height: 300 }}>
      <ReactFlow
        nodes={baseNodes}
        edges={makeEdge({ shape: 'circle', duration: 2, path: 'smoothstep', direction: 'forward', repeat: 'indefinite' })}
        edgeTypes={edgeTypes}
        fitView
      />
    </div>
  ),
};
