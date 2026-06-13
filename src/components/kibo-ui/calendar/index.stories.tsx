import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import {
  CalendarBody,
  CalendarDate,
  CalendarDatePagination,
  CalendarDatePicker,
  CalendarHeader,
  CalendarItem,
  CalendarMonthPicker,
  CalendarProvider,
  CalendarYearPicker,
} from './index';

const meta = {
  component: CalendarProvider,
  tags: ['autodocs'],
  title: 'Kibo UI/Calendar',
} satisfies Meta<typeof CalendarProvider>;

export default meta;
type Story = StoryObj<typeof meta>;

const exampleFeatures = [
  {
    id: '1',
    name: 'Launch campaign',
    startAt: new Date('2024-11-01'),
    endAt: new Date('2024-11-05'),
    status: { id: 's1', name: 'In Progress', color: '#3b82f6' },
  },
  {
    id: '2',
    name: 'Design review',
    startAt: new Date('2024-11-10'),
    endAt: new Date('2024-11-10'),
    status: { id: 's2', name: 'Done', color: '#22c55e' },
  },
  {
    id: '3',
    name: 'Sprint planning',
    startAt: new Date('2024-11-15'),
    endAt: new Date('2024-11-15'),
    status: { id: 's3', name: 'Todo', color: '#f59e0b' },
  },
  {
    id: '4',
    name: 'Quarterly report',
    startAt: new Date('2024-11-20'),
    endAt: new Date('2024-11-20'),
    status: { id: 's4', name: 'Blocked', color: '#ef4444' },
  },
  {
    id: '5',
    name: 'User interviews',
    startAt: new Date('2024-11-25'),
    endAt: new Date('2024-11-25'),
    status: { id: 's5', name: 'In Progress', color: '#3b82f6' },
  },
];

export const Default: Story = {
  render: () => (
    <CalendarProvider className="h-[600px] border rounded-lg overflow-hidden">
      <CalendarDate>
        <CalendarDatePicker>
          <CalendarMonthPicker />
          <CalendarYearPicker end={2030} start={2020} />
        </CalendarDatePicker>
        <CalendarDatePagination />
      </CalendarDate>
      <CalendarHeader />
      <CalendarBody features={exampleFeatures}>
        {({ feature }) => <CalendarItem feature={feature} key={feature.id} />}
      </CalendarBody>
    </CalendarProvider>
  ),
};

export const Empty: Story = {
  render: () => (
    <CalendarProvider className="h-[600px] border rounded-lg overflow-hidden">
      <CalendarDate>
        <CalendarDatePicker>
          <CalendarMonthPicker />
          <CalendarYearPicker end={2030} start={2020} />
        </CalendarDatePicker>
        <CalendarDatePagination />
      </CalendarDate>
      <CalendarHeader />
      <CalendarBody features={[]}>
        {({ feature }) => <CalendarItem feature={feature} key={feature.id} />}
      </CalendarBody>
    </CalendarProvider>
  ),
};

export const MondayStart: Story = {
  render: () => (
    <CalendarProvider className="h-[600px] border rounded-lg overflow-hidden" startDay={1}>
      <CalendarDate>
        <CalendarDatePicker>
          <CalendarMonthPicker />
          <CalendarYearPicker end={2030} start={2020} />
        </CalendarDatePicker>
        <CalendarDatePagination />
      </CalendarDate>
      <CalendarHeader />
      <CalendarBody features={exampleFeatures}>
        {({ feature }) => <CalendarItem feature={feature} key={feature.id} />}
      </CalendarBody>
    </CalendarProvider>
  ),
};
