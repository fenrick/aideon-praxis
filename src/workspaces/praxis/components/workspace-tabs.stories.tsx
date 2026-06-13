import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { ReactFlowProvider } from '@xyflow/react';

import { EMPTY_SELECTION } from 'aideon/canvas/types';

import { WorkspaceTabs } from './workspace-tabs';

const meta = {
  component: WorkspaceTabs,
  tags: ['autodocs'],
  title: 'Workspaces/Praxis/WorkspaceTabs',
  decorators: [
    (Story) => (
      <ReactFlowProvider>
        <Story />
      </ReactFlowProvider>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof WorkspaceTabs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const OverviewTab: Story = {
  args: {
    widgets: [],
    selection: EMPTY_SELECTION,
    value: 'overview',
    onSelectionChange: () => undefined,
    onRequestMetaModelFocus: () => undefined,
    onValueChange: () => undefined,
  },
};

export const CanvasTab: Story = {
  args: {
    widgets: [],
    selection: EMPTY_SELECTION,
    value: 'canvas',
    onSelectionChange: () => undefined,
    onRequestMetaModelFocus: () => undefined,
    onValueChange: () => undefined,
  },
};

export const TimelineTab: Story = {
  args: {
    widgets: [],
    selection: EMPTY_SELECTION,
    value: 'timeline',
    onSelectionChange: () => undefined,
    onRequestMetaModelFocus: () => undefined,
    onValueChange: () => undefined,
  },
};

export const ActivityTab: Story = {
  args: {
    widgets: [],
    selection: EMPTY_SELECTION,
    value: 'activity',
    onSelectionChange: () => undefined,
    onRequestMetaModelFocus: () => undefined,
    onValueChange: () => undefined,
  },
};
