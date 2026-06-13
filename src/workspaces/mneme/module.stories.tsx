import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { MNEME_WORKSPACE } from './module';

const { Content, Navigation, Inspector } = MNEME_WORKSPACE;

const meta = {
  component: Content,
  tags: ['autodocs'],
  title: 'Workspaces/Mneme/Module',
} satisfies Meta<typeof Content>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ContentView: Story = {};

export const NavigationView: Story = {
  render: () => (
    <Navigation
      activeWorkspaceId="mneme"
      onWorkspaceSelect={() => undefined}
      workspaceOptions={[
        { id: 'praxis', label: 'Praxis', disabled: false },
        { id: 'metis', label: 'Metis', disabled: false },
        { id: 'mneme', label: 'Mneme', disabled: false },
      ]}
    />
  ),
};

export const InspectorView: Story = {
  render: () => <Inspector />,
};
