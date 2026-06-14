import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { WidgetToolbar } from './widget-toolbar';

const meta = {
  component: WidgetToolbar,
  tags: ['autodocs'],
  title: 'Workspaces/Praxis/Widgets/WidgetToolbar',
} satisfies Meta<typeof WidgetToolbar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Loading: Story = {
  args: {
    fallbackTitle: 'Twin overview graph',
    loading: true,
    onRefresh: () => undefined,
  },
};

export const WithMetadata: Story = {
  args: {
    metadata: {
      id: 'executive-overview',
      name: 'Executive Overview',
      asOf: '2025-06-01T00:00:00Z',
      scenario: 'main',
    },
    fallbackTitle: 'Twin overview graph',
    loading: false,
    onRefresh: () => undefined,
  },
};

export const NoMetadata: Story = {
  args: {
    fallbackTitle: 'Capability catalogue',
    loading: false,
    onRefresh: () => undefined,
  },
};

export const MetadataWithCommitHash: Story = {
  args: {
    metadata: {
      id: 'catalogue-view',
      name: 'Capability Catalogue',
      asOf: 'abc123def456',
      scenario: 'main',
    },
    fallbackTitle: 'Capability catalogue',
    loading: false,
    onRefresh: () => undefined,
  },
};
