import type { Meta, StoryObj } from '@storybook/nextjs';
import { fn } from '@storybook/test';

import { ErrorFrame } from './error-frame';

const meta: Meta<typeof ErrorFrame> = {
  title: 'Design System/Blocks/ErrorFrame',
  component: ErrorFrame,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Wraps a failed surface with an explicit error treatment. Never hides the failure — always surfaces message and optional retry. Use this instead of blank states, spinner-forever, or silent fallbacks.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof ErrorFrame>;

export const Default: Story = {
  args: {
    message: 'Failed to load workspace data.',
  },
};

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
  parameters: {
    docs: {
      description: {
        story: 'When `onRetry` is provided, a Retry button appears. The handler is called on click — wire this to the data-fetching action at the feature level.',
      },
    },
  },
};
