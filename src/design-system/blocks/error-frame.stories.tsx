import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { ErrorFrame } from './error-frame';

const meta = {
  component: ErrorFrame,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Wraps a failed surface with an explicit error treatment. Never hides the failure — always surfaces message and optional retry.',
      },
    },
  },
} satisfies Meta<typeof ErrorFrame>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { message: 'Failed to load workspace data.' } };

export const WithDetail: Story = {
  args: {
    message: 'Could not connect to the host engine.',
    detail: 'Check that the Tauri host process is running.',
  },
};

export const WithRetry: Story = {
  args: {
    message: 'Index build failed.',
    detail: 'Last attempt: 14:23',
    onRetry: fn(),
  },
};
