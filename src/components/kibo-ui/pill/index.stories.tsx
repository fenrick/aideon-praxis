import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { TagIcon, XIcon } from 'lucide-react';
import {
  Pill,
  PillAvatar,
  PillAvatarGroup,
  PillButton,
  PillDelta,
  PillIcon,
  PillIndicator,
  PillStatus,
} from './index';

const meta = {
  component: Pill,
  tags: ['autodocs'],
  title: 'Kibo UI/Pill',
} satisfies Meta<typeof Pill>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <Pill>Default pill</Pill>,
};

export const WithAvatar: Story = {
  render: () => (
    <Pill>
      <PillAvatar fallback="JD" src="https://github.com/shadcn.png" />
      Jane Doe
    </Pill>
  ),
};

export const WithDismiss: Story = {
  render: () => (
    <Pill>
      Frontend
      <PillButton>
        <XIcon size={10} />
      </PillButton>
    </Pill>
  ),
};

export const WithStatusIndicator: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      <Pill>
        <PillIndicator variant="success" />
        Online
      </Pill>
      <Pill>
        <PillIndicator pulse variant="success" />
        Live
      </Pill>
      <Pill>
        <PillIndicator variant="warning" />
        Degraded
      </Pill>
      <Pill>
        <PillIndicator variant="error" />
        Offline
      </Pill>
      <Pill>
        <PillIndicator variant="info" />
        Syncing
      </Pill>
    </div>
  ),
};

export const WithDelta: Story = {
  render: () => (
    <div className="flex gap-2">
      <Pill>
        <PillDelta delta={5} />
        +5%
      </Pill>
      <Pill>
        <PillDelta delta={-3} />
        -3%
      </Pill>
      <Pill>
        <PillDelta delta={0} />
        No change
      </Pill>
    </div>
  ),
};

export const WithStatus: Story = {
  render: () => (
    <Pill>
      <PillStatus>
        <PillIndicator variant="success" />
        Deployed
      </PillStatus>
      production
    </Pill>
  ),
};

export const WithIcon: Story = {
  render: () => (
    <Pill>
      <PillIcon icon={TagIcon} />
      Feature
    </Pill>
  ),
};

export const WithAvatarGroup: Story = {
  render: () => (
    <Pill>
      <PillAvatarGroup>
        <PillAvatar fallback="A" src="https://github.com/shadcn.png" />
        <PillAvatar fallback="B" />
        <PillAvatar fallback="C" />
      </PillAvatarGroup>
      3 members
    </Pill>
  ),
};

export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Pill variant="default">Default</Pill>
      <Pill variant="secondary">Secondary</Pill>
      <Pill variant="outline">Outline</Pill>
      <Pill variant="destructive">Destructive</Pill>
    </div>
  ),
};
