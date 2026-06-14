import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { MetaModelPanel } from './meta-model-panel';

const meta = {
  component: MetaModelPanel,
  tags: ['autodocs'],
  title: 'Workspaces/Praxis/Dashboard/MetaModelPanel',
  parameters: {
    docs: {
      description: {
        component:
          'Fetches the meta-model via Tauri IPC on mount. Renders a loading state until data arrives.',
      },
    },
  },
} satisfies Meta<typeof MetaModelPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const WithFocusEntry: Story = {
  args: {
    focusEntryId: 'capability',
  },
};
