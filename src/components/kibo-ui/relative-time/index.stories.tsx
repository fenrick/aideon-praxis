import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import {
  RelativeTime,
  RelativeTimeZone,
  RelativeTimeZoneDate,
  RelativeTimeZoneDisplay,
  RelativeTimeZoneLabel,
} from './index';

const meta = {
  component: RelativeTime,
  tags: ['autodocs'],
  title: 'Kibo UI/RelativeTime',
} satisfies Meta<typeof RelativeTime>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <RelativeTime>
      <RelativeTimeZone zone="UTC">
        <RelativeTimeZoneDate />
        <RelativeTimeZoneLabel>UTC</RelativeTimeZoneLabel>
        <RelativeTimeZoneDisplay />
      </RelativeTimeZone>
    </RelativeTime>
  ),
};

export const MultipleZones: Story = {
  render: () => (
    <RelativeTime className="min-w-[280px]">
      <RelativeTimeZone zone="America/New_York">
        <RelativeTimeZoneDate />
        <RelativeTimeZoneLabel>NYC</RelativeTimeZoneLabel>
        <RelativeTimeZoneDisplay />
      </RelativeTimeZone>
      <RelativeTimeZone zone="Europe/London">
        <RelativeTimeZoneDate />
        <RelativeTimeZoneLabel>LON</RelativeTimeZoneLabel>
        <RelativeTimeZoneDisplay />
      </RelativeTimeZone>
      <RelativeTimeZone zone="Asia/Tokyo">
        <RelativeTimeZoneDate />
        <RelativeTimeZoneLabel>TYO</RelativeTimeZoneLabel>
        <RelativeTimeZoneDisplay />
      </RelativeTimeZone>
      <RelativeTimeZone zone="Australia/Sydney">
        <RelativeTimeZoneDate />
        <RelativeTimeZoneLabel>SYD</RelativeTimeZoneLabel>
        <RelativeTimeZoneDisplay />
      </RelativeTimeZone>
    </RelativeTime>
  ),
};

export const FixedTime: Story = {
  render: () => (
    <RelativeTime time={new Date('2024-11-15T14:30:00Z')}>
      <RelativeTimeZone zone="UTC">
        <RelativeTimeZoneDate />
        <RelativeTimeZoneLabel>UTC</RelativeTimeZoneLabel>
        <RelativeTimeZoneDisplay />
      </RelativeTimeZone>
      <RelativeTimeZone zone="America/Los_Angeles">
        <RelativeTimeZoneDate />
        <RelativeTimeZoneLabel>LAX</RelativeTimeZoneLabel>
        <RelativeTimeZoneDisplay />
      </RelativeTimeZone>
      <RelativeTimeZone zone="Europe/Paris">
        <RelativeTimeZoneDate />
        <RelativeTimeZoneLabel>PAR</RelativeTimeZoneLabel>
        <RelativeTimeZoneDisplay />
      </RelativeTimeZone>
    </RelativeTime>
  ),
};

export const CustomFormat: Story = {
  render: () => (
    <RelativeTime
      dateFormatOptions={{ weekday: 'long', month: 'long', day: 'numeric' }}
      timeFormatOptions={{ hour: '2-digit', minute: '2-digit' }}
    >
      <RelativeTimeZone zone="UTC">
        <RelativeTimeZoneDate />
        <RelativeTimeZoneLabel>UTC</RelativeTimeZoneLabel>
        <RelativeTimeZoneDisplay />
      </RelativeTimeZone>
      <RelativeTimeZone zone="America/Chicago">
        <RelativeTimeZoneDate />
        <RelativeTimeZoneLabel>CHI</RelativeTimeZoneLabel>
        <RelativeTimeZoneDisplay />
      </RelativeTimeZone>
    </RelativeTime>
  ),
};
