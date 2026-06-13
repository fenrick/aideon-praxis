import { ArrowRightIcon, SparklesIcon } from 'lucide-react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Announcement, AnnouncementTag, AnnouncementTitle } from './index';

const meta = {
  component: Announcement,
  tags: ['autodocs'],
  title: 'Kibo UI/Announcement',
} satisfies Meta<typeof Announcement>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Announcement>
      <AnnouncementTag>New</AnnouncementTag>
      <AnnouncementTitle>
        Introducing our latest feature
        <ArrowRightIcon size={14} />
      </AnnouncementTitle>
    </Announcement>
  ),
};

export const Themed: Story = {
  render: () => (
    <Announcement themed>
      <AnnouncementTag>Beta</AnnouncementTag>
      <AnnouncementTitle>
        Try the new dashboard experience
        <ArrowRightIcon size={14} />
      </AnnouncementTitle>
    </Announcement>
  ),
};

export const WithIcon: Story = {
  render: () => (
    <Announcement>
      <AnnouncementTag>
        <SparklesIcon size={12} />
        AI
      </AnnouncementTag>
      <AnnouncementTitle>Copilot is now available in all plans</AnnouncementTitle>
    </Announcement>
  ),
};

export const LongText: Story = {
  render: () => (
    <div style={{ maxWidth: 320 }}>
      <Announcement>
        <AnnouncementTag>Update</AnnouncementTag>
        <AnnouncementTitle>
          A very long announcement title that should truncate gracefully
          <ArrowRightIcon size={14} />
        </AnnouncementTitle>
      </Announcement>
    </div>
  ),
};

export const TagOnly: Story = {
  render: () => (
    <Announcement>
      <AnnouncementTag>Coming soon</AnnouncementTag>
    </Announcement>
  ),
};
