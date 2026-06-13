import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import {
  MiniCalendar,
  MiniCalendarDay,
  MiniCalendarDays,
  MiniCalendarNavigation,
} from './index';

const meta = {
  component: MiniCalendar,
  tags: ['autodocs'],
  title: 'Kibo UI/MiniCalendar',
} satisfies Meta<typeof MiniCalendar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <MiniCalendar defaultStartDate={new Date('2024-11-11')}>
      <MiniCalendarNavigation direction="prev" />
      <MiniCalendarDays>
        {(date) => <MiniCalendarDay date={date} key={date.toISOString()} />}
      </MiniCalendarDays>
      <MiniCalendarNavigation direction="next" />
    </MiniCalendar>
  ),
};

export const WithSelectedDate: Story = {
  render: () => (
    <MiniCalendar
      defaultStartDate={new Date('2024-11-11')}
      defaultValue={new Date('2024-11-13')}
    >
      <MiniCalendarNavigation direction="prev" />
      <MiniCalendarDays>
        {(date) => <MiniCalendarDay date={date} key={date.toISOString()} />}
      </MiniCalendarDays>
      <MiniCalendarNavigation direction="next" />
    </MiniCalendar>
  ),
};

export const SevenDays: Story = {
  render: () => (
    <MiniCalendar days={7} defaultStartDate={new Date('2024-11-11')}>
      <MiniCalendarNavigation direction="prev" />
      <MiniCalendarDays>
        {(date) => <MiniCalendarDay date={date} key={date.toISOString()} />}
      </MiniCalendarDays>
      <MiniCalendarNavigation direction="next" />
    </MiniCalendar>
  ),
};

export const ThreeDays: Story = {
  render: () => (
    <MiniCalendar days={3} defaultStartDate={new Date('2024-11-15')}>
      <MiniCalendarNavigation direction="prev" />
      <MiniCalendarDays>
        {(date) => <MiniCalendarDay date={date} key={date.toISOString()} />}
      </MiniCalendarDays>
      <MiniCalendarNavigation direction="next" />
    </MiniCalendar>
  ),
};

const ControlledMiniCalendar = () => {
  const [selected, setSelected] = useState<Date | undefined>(undefined);

  return (
    <div className="flex flex-col gap-2">
      <MiniCalendar
        defaultStartDate={new Date('2024-11-11')}
        onValueChange={setSelected}
        value={selected}
      >
        <MiniCalendarNavigation direction="prev" />
        <MiniCalendarDays>
          {(date) => <MiniCalendarDay date={date} key={date.toISOString()} />}
        </MiniCalendarDays>
        <MiniCalendarNavigation direction="next" />
      </MiniCalendar>
      {selected && (
        <p className="text-sm text-muted-foreground">
          Selected: {selected.toLocaleDateString('en-US', { dateStyle: 'long' })}
        </p>
      )}
    </div>
  );
};

export const Controlled: Story = {
  render: () => <ControlledMiniCalendar />,
};
