import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { ArtefactFrame } from './artefact-frame';

const meta = {
  component: ArtefactFrame,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Base shell for all artefact forms. Provides loading, empty, and error shells as built-in states. Pass `state` to switch between them; `ready` renders children.',
      },
    },
  },
} satisfies Meta<typeof ArtefactFrame>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Ready: Story = {
  args: {
    state: 'ready',
    children: <div className="rounded-lg border p-8 text-center text-sm">Content renders here</div>,
  },
};

export const Loading: Story = { args: { state: 'loading', loadingRows: 4 } };

export const Empty: Story = {
  args: {
    state: 'empty',
    emptyTitle: 'No results',
    emptyDescription: 'Try adjusting the scope filter or as-of date.',
  },
};

export const Error: Story = {
  args: { state: 'error', errorMessage: 'Failed to load catalogue data.', onRetry: fn() },
};
