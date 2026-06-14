import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { SearchBar } from './search-bar';

const meta = {
  component: SearchBar,
  tags: ['autodocs'],
  title: 'Workspaces/Praxis/Shell/SearchBar',
  parameters: {
    docs: {
      description: {
        component:
          'Debounced search bar with keyboard navigation. Reads from searchStore and performs Tauri IPC lookups for results.',
      },
    },
  },
} satisfies Meta<typeof SearchBar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
