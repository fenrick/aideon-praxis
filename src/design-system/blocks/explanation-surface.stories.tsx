import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { ExplanationSurface } from './explanation-surface';

const meta = {
  component: ExplanationSurface,
  tags: ['autodocs'],
} satisfies Meta<typeof ExplanationSurface>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithHeading: Story = {
  name: 'With heading',
  args: {
    heading: 'Why this value',
    children: 'Derived from the last three months of utilisation telemetry.',
  },
};

export const WithoutHeading: Story = {
  name: 'Without heading',
  args: {
    children: 'This node was last seen active during the Q4 maintenance window.',
  },
};

export const LongContent: Story = {
  name: 'Long content',
  args: {
    heading: 'Confidence rationale',
    children:
      'Score computed from three independent sources: a network-scan connector, a CMDB import, and manual confirmation. All three agree on the value, raising confidence to the high tier. The most recent assertion was recorded 2024-11-15.',
  },
  decorators: [(Story) => <div className="w-72"><Story /></div>],
};
