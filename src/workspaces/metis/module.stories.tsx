import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { METIS_WORKSPACE } from './module';

const { Content, Navigation, Inspector } = METIS_WORKSPACE;

const meta = {
  component: Content,
  tags: ['autodocs'],
  title: 'Workspaces/Metis/Module',
} satisfies Meta<typeof Content>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ContentView: Story = {};

export const NavigationView: Story = {
  render: () => (
    <Navigation
      activeWorkspaceId="metis"
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
