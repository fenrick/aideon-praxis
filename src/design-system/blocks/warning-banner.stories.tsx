import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { WarningBanner } from './warning-banner';

const meta = {
  component: WarningBanner,
  tags: ['autodocs'],
} satisfies Meta<typeof WarningBanner>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { message: 'Scenario diverges from mainline after 2026-Q3.' },
};

export const WithDetail: Story = {
  name: 'With detail',
  args: {
    message: 'Plan values are overriding actuals.',
    detail: 'Switch the layer selector to Actual to see confirmed data.',
  },
};
