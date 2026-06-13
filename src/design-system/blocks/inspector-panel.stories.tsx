import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { InspectorPanel } from './inspector-panel';
import { PropertyList } from './property-list';

const meta = {
  component: InspectorPanel,
  tags: ['autodocs'],
} satisfies Meta<typeof InspectorPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Properties',
    description: 'Select an item to inspect its properties.',
    children: <p className="text-muted-foreground text-sm">Nothing selected.</p>,
  },
};

export const WithBadge: Story = {
  args: {
    title: 'Properties',
    badge: (
      <Badge className="text-[0.6rem] uppercase tracking-widest" variant="secondary">
        Node
      </Badge>
    ),
    description: 'Edit node fields.',
    children: (
      <PropertyList
        items={[
          { key: 'name', label: 'Name', value: 'Capability A' },
          { key: 'type', label: 'Type', value: 'Capability' },
          { key: 'status', label: 'Status', value: 'Active' },
        ]}
      />
    ),
  },
};

export const WithFooter: Story = {
  args: {
    title: 'Properties',
    description: 'Edit and save node fields.',
    footer: (
      <div className="flex gap-2 border-t p-4">
        <Button size="sm">Save changes</Button>
        <Button size="sm" variant="outline">
          Reset
        </Button>
      </div>
    ),
    children: <PropertyList items={[{ key: 'name', label: 'Name', value: 'Capability A' }]} />,
  },
};
