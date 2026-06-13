import { HeartIcon, StarIcon } from 'lucide-react';
import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Rating, RatingButton } from './index';

const meta = {
  component: Rating,
  tags: ['autodocs'],
  title: 'Kibo UI/Rating',
} satisfies Meta<typeof Rating>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Rating defaultValue={3}>
      <RatingButton />
      <RatingButton />
      <RatingButton />
      <RatingButton />
      <RatingButton />
    </Rating>
  ),
};

export const Empty: Story = {
  render: () => (
    <Rating defaultValue={0}>
      <RatingButton />
      <RatingButton />
      <RatingButton />
      <RatingButton />
      <RatingButton />
    </Rating>
  ),
};

export const FullRating: Story = {
  render: () => (
    <Rating defaultValue={5}>
      <RatingButton />
      <RatingButton />
      <RatingButton />
      <RatingButton />
      <RatingButton />
    </Rating>
  ),
};

export const ReadOnly: Story = {
  render: () => (
    <Rating readOnly value={4}>
      <RatingButton />
      <RatingButton />
      <RatingButton />
      <RatingButton />
      <RatingButton />
    </Rating>
  ),
};

export const ThreeStars: Story = {
  render: () => (
    <Rating defaultValue={2}>
      <RatingButton />
      <RatingButton />
      <RatingButton />
    </Rating>
  ),
};

export const WithHeartIcon: Story = {
  render: () => (
    <Rating defaultValue={3}>
      <RatingButton icon={<HeartIcon className="text-rose-500" />} />
      <RatingButton icon={<HeartIcon className="text-rose-500" />} />
      <RatingButton icon={<HeartIcon className="text-rose-500" />} />
      <RatingButton icon={<HeartIcon className="text-rose-500" />} />
      <RatingButton icon={<HeartIcon className="text-rose-500" />} />
    </Rating>
  ),
};

const ControlledRating = () => {
  const [value, setValue] = useState(2);

  return (
    <div className="flex flex-col gap-2">
      <Rating onValueChange={setValue} value={value}>
        <RatingButton />
        <RatingButton />
        <RatingButton />
        <RatingButton />
        <RatingButton />
      </Rating>
      <p className="text-sm text-muted-foreground">Rating: {value} / 5</p>
    </div>
  );
};

export const Controlled: Story = {
  render: () => <ControlledRating />,
};

export const LargeSize: Story = {
  render: () => (
    <Rating defaultValue={3}>
      <RatingButton size={32} />
      <RatingButton size={32} />
      <RatingButton size={32} />
      <RatingButton size={32} />
      <RatingButton size={32} />
    </Rating>
  ),
};
