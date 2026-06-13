import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import {
  BaseNode,
  BaseNodeContent,
  BaseNodeFooter,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
} from './base-node';

const meta = {
  component: BaseNode,
  tags: ['autodocs'],
} satisfies Meta<typeof BaseNode>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: 'Default node',
  render: () => (
    <div className="p-8">
      <BaseNode className="w-48">
        <BaseNodeHeader>
          <BaseNodeHeaderTitle>Node Title</BaseNodeHeaderTitle>
        </BaseNodeHeader>
        <BaseNodeContent>
          <p className="text-muted-foreground text-xs">Node content goes here.</p>
        </BaseNodeContent>
      </BaseNode>
    </div>
  ),
};

export const WithFooter: Story = {
  name: 'With footer',
  render: () => (
    <div className="p-8">
      <BaseNode className="w-48">
        <BaseNodeHeader>
          <BaseNodeHeaderTitle>Node Title</BaseNodeHeaderTitle>
        </BaseNodeHeader>
        <BaseNodeContent>
          <p className="text-muted-foreground text-xs">Main content area.</p>
        </BaseNodeContent>
        <BaseNodeFooter>
          <span className="text-muted-foreground text-xs">Footer info</span>
        </BaseNodeFooter>
      </BaseNode>
    </div>
  ),
};

export const WithBadgeInHeader: Story = {
  name: 'Header with type badge',
  render: () => (
    <div className="p-8">
      <BaseNode className="w-56">
        <BaseNodeHeader>
          <BaseNodeHeaderTitle>Capability A</BaseNodeHeaderTitle>
          <span className="text-muted-foreground text-xs">Capability</span>
        </BaseNodeHeader>
        <BaseNodeContent>
          <p className="text-muted-foreground text-xs">Platform infrastructure component.</p>
        </BaseNodeContent>
      </BaseNode>
    </div>
  ),
};

export const AllSubComponents: Story = {
  name: 'All sub-components',
  render: () => (
    <div className="flex flex-col gap-4 p-8">
      <div>
        <p className="text-muted-foreground mb-2 text-xs">BaseNode (wrapper)</p>
        <BaseNode className="w-48 p-2">
          <span className="text-xs">bare node</span>
        </BaseNode>
      </div>
      <div>
        <p className="text-muted-foreground mb-2 text-xs">BaseNodeHeader</p>
        <BaseNode className="w-48">
          <BaseNodeHeader>
            <BaseNodeHeaderTitle>Title</BaseNodeHeaderTitle>
          </BaseNodeHeader>
        </BaseNode>
      </div>
      <div>
        <p className="text-muted-foreground mb-2 text-xs">BaseNodeContent</p>
        <BaseNode className="w-48">
          <BaseNodeContent>
            <span className="text-xs">content</span>
          </BaseNodeContent>
        </BaseNode>
      </div>
      <div>
        <p className="text-muted-foreground mb-2 text-xs">BaseNodeFooter</p>
        <BaseNode className="w-48">
          <BaseNodeFooter>
            <span className="text-xs">footer</span>
          </BaseNodeFooter>
        </BaseNode>
      </div>
    </div>
  ),
};
