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

// Deterministic PRNG (mulberry32) so the story renders identical demo data on
// every run — stable Storybook visual snapshots, and no Math.random() (which
// Opengrep flags as a weak RNG even for non-security demo data).
const createRng = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const generateActivities = (year: number) => {
  const activities = [];
  const start = new Date(`${year}-01-01`);
  const end = new Date(`${year}-12-31`);
  const rng = createRng(year);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const rand = rng();
    const level = rand < 0.5 ? 0 : rand < 0.7 ? 1 : rand < 0.85 ? 2 : rand < 0.95 ? 3 : 4;
    const count = level * Math.floor(rng() * 5 + 1);
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
