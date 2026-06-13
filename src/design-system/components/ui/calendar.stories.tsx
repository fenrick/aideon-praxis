import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import * as React from 'react';
import { Calendar } from './calendar';

const meta = {
  component: Calendar,
  tags: ['autodocs'],
} satisfies Meta<typeof Calendar>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    const [date, setDate] = React.useState<Date | undefined>(new Date());
    return (
      <Calendar
        mode="single"
        selected={date}
        onSelect={setDate}
      />
    );
  },
};

export const Range: Story = {
  render: () => {
    const [range, setRange] = React.useState<{ from?: Date; to?: Date } | undefined>();
    return (
      <Calendar
        mode="range"
        selected={range}
        onSelect={setRange}
      />
    );
  },
};

export const DropdownCaption: Story = {
  render: () => {
    const [date, setDate] = React.useState<Date | undefined>(new Date());
    return (
      <Calendar
        mode="single"
        captionLayout="dropdown"
        selected={date}
        onSelect={setDate}
        fromYear={2020}
        toYear={2030}
      />
    );
  },
};
