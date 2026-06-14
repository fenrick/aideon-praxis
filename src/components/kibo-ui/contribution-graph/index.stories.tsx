import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import {
  ContributionGraph,
  ContributionGraphBlock,
  ContributionGraphCalendar,
  ContributionGraphFooter,
  ContributionGraphLegend,
  ContributionGraphTotalCount,
} from './index';

const meta = {
  component: ContributionGraph,
  tags: ['autodocs'],
  title: 'Kibo UI/ContributionGraph',
  args: {
    data: [],
    children: null,
  },
} satisfies Meta<typeof ContributionGraph>;

export default meta;
type Story = StoryObj<typeof meta>;

const generateActivities = (year: number) => {
  const activities = [];
  const start = new Date(`${year}-01-01`);
  const end = new Date(`${year}-12-31`);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const rand = Math.random();
    const level = rand < 0.5 ? 0 : rand < 0.7 ? 1 : rand < 0.85 ? 2 : rand < 0.95 ? 3 : 4;
    const count = level * Math.floor(Math.random() * 5 + 1);
    activities.push({
      date: d.toISOString().slice(0, 10),
      count,
      level,
    });
  }

  return activities;
};

const data2023 = generateActivities(2023);

export const Default: Story = {
  render: () => (
    <ContributionGraph data={data2023}>
      <ContributionGraphCalendar>
        {({ activity, dayIndex, weekIndex }) => (
          <ContributionGraphBlock
            activity={activity}
            dayIndex={dayIndex}
            key={`${weekIndex}-${dayIndex}`}
            weekIndex={weekIndex}
          />
        )}
      </ContributionGraphCalendar>
      <ContributionGraphFooter>
        <ContributionGraphTotalCount />
        <ContributionGraphLegend />
      </ContributionGraphFooter>
    </ContributionGraph>
  ),
};

export const WithoutMonthLabels: Story = {
  render: () => (
    <ContributionGraph data={data2023}>
      <ContributionGraphCalendar hideMonthLabels>
        {({ activity, dayIndex, weekIndex }) => (
          <ContributionGraphBlock
            activity={activity}
            dayIndex={dayIndex}
            key={`${weekIndex}-${dayIndex}`}
            weekIndex={weekIndex}
          />
        )}
      </ContributionGraphCalendar>
      <ContributionGraphFooter>
        <ContributionGraphTotalCount />
        <ContributionGraphLegend />
      </ContributionGraphFooter>
    </ContributionGraph>
  ),
};

export const SmallBlocks: Story = {
  render: () => (
    <ContributionGraph blockSize={8} blockMargin={2} data={data2023}>
      <ContributionGraphCalendar>
        {({ activity, dayIndex, weekIndex }) => (
          <ContributionGraphBlock
            activity={activity}
            dayIndex={dayIndex}
            key={`${weekIndex}-${dayIndex}`}
            weekIndex={weekIndex}
          />
        )}
      </ContributionGraphCalendar>
      <ContributionGraphFooter>
        <ContributionGraphTotalCount />
        <ContributionGraphLegend />
      </ContributionGraphFooter>
    </ContributionGraph>
  ),
};

export const CustomTotalCount: Story = {
  render: () => (
    <ContributionGraph data={data2023}>
      <ContributionGraphCalendar>
        {({ activity, dayIndex, weekIndex }) => (
          <ContributionGraphBlock
            activity={activity}
            dayIndex={dayIndex}
            key={`${weekIndex}-${dayIndex}`}
            weekIndex={weekIndex}
          />
        )}
      </ContributionGraphCalendar>
      <ContributionGraphFooter>
        <ContributionGraphTotalCount>
          {({ totalCount, year }) => (
            <span className="text-muted-foreground text-sm">
              {totalCount} contributions in {year}
            </span>
          )}
        </ContributionGraphTotalCount>
        <ContributionGraphLegend />
      </ContributionGraphFooter>
    </ContributionGraph>
  ),
};
