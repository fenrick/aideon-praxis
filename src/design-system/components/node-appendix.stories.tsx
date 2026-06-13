import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { BaseNode, BaseNodeContent, BaseNodeHeader, BaseNodeHeaderTitle } from './base-node';
import { NodeAppendix } from './node-appendix';

const meta = {
  component: NodeAppendix,
  tags: ['autodocs'],
} satisfies Meta<typeof NodeAppendix>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Top: Story = {
  name: 'Position: top',
  render: () => (
    <div className="flex items-center justify-center p-24">
      <div className="relative inline-block">
        <NodeAppendix position="top">
          <span className="text-xs">Appendix content</span>
        </NodeAppendix>
        <BaseNode className="w-48">
          <BaseNodeHeader>
            <BaseNodeHeaderTitle>Node</BaseNodeHeaderTitle>
          </BaseNodeHeader>
          <BaseNodeContent>
            <p className="text-muted-foreground text-xs">Main content.</p>
          </BaseNodeContent>
        </BaseNode>
      </div>
    </div>
  ),
};

export const Bottom: Story = {
  name: 'Position: bottom',
  render: () => (
    <div className="flex items-center justify-center p-24">
      <div className="relative inline-block">
        <BaseNode className="w-48">
          <BaseNodeHeader>
            <BaseNodeHeaderTitle>Node</BaseNodeHeaderTitle>
          </BaseNodeHeader>
          <BaseNodeContent>
            <p className="text-muted-foreground text-xs">Main content.</p>
          </BaseNodeContent>
        </BaseNode>
        <NodeAppendix position="bottom">
          <span className="text-xs">Appendix content</span>
        </NodeAppendix>
      </div>
    </div>
  ),
};

export const AllPositions: Story = {
  name: 'All positions',
  render: () => {
    const positions = ['top', 'bottom', 'left', 'right'] as const;
    return (
      <div className="flex flex-wrap gap-24 p-24">
        {positions.map((position) => (
          <div key={position} className="flex flex-col items-center gap-2">
            <div className="relative inline-block">
              {position === 'top' && (
                <NodeAppendix position={position}>
                  <span className="text-xs">{position}</span>
                </NodeAppendix>
              )}
              <BaseNode className="w-36">
                <BaseNodeHeader>
                  <BaseNodeHeaderTitle>Node</BaseNodeHeaderTitle>
                </BaseNodeHeader>
              </BaseNode>
              {(position === 'bottom' || position === 'left' || position === 'right') && (
                <NodeAppendix position={position}>
                  <span className="text-xs">{position}</span>
                </NodeAppendix>
              )}
            </div>
            <span className="text-muted-foreground text-xs">{position}</span>
          </div>
        ))}
      </div>
    );
  },
};
