import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import {
  Glimpse,
  GlimpseContent,
  GlimpseDescription,
  GlimpseImage,
  GlimpseTitle,
  GlimpseTrigger,
} from './index';

const meta = {
  component: Glimpse,
  tags: ['autodocs'],
  title: 'Kibo UI/Glimpse',
} satisfies Meta<typeof Glimpse>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Glimpse>
      <GlimpseTrigger asChild>
        <a className="cursor-pointer underline" href="#">
          Hover over this link
        </a>
      </GlimpseTrigger>
      <GlimpseContent>
        <GlimpseTitle>Preview Title</GlimpseTitle>
        <GlimpseDescription>
          This is a brief description of the linked content that provides context to the user.
        </GlimpseDescription>
      </GlimpseContent>
    </Glimpse>
  ),
};

export const WithImage: Story = {
  render: () => (
    <Glimpse>
      <GlimpseTrigger asChild>
        <a className="cursor-pointer underline" href="#">
          Hover to preview
        </a>
      </GlimpseTrigger>
      <GlimpseContent>
        <GlimpseImage
          alt="Preview"
          src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80"
        />
        <GlimpseTitle>Mountain Landscape</GlimpseTitle>
        <GlimpseDescription>
          A stunning mountain vista with snow-capped peaks and a clear blue sky.
        </GlimpseDescription>
      </GlimpseContent>
    </Glimpse>
  ),
};

export const TitleOnly: Story = {
  render: () => (
    <Glimpse>
      <GlimpseTrigger asChild>
        <span className="cursor-pointer underline">Documentation</span>
      </GlimpseTrigger>
      <GlimpseContent>
        <GlimpseTitle>Component Documentation</GlimpseTitle>
      </GlimpseContent>
    </Glimpse>
  ),
};

export const LongDescription: Story = {
  render: () => (
    <Glimpse>
      <GlimpseTrigger asChild>
        <button type="button" className="underline">
          Hover for details
        </button>
      </GlimpseTrigger>
      <GlimpseContent>
        <GlimpseTitle>Detailed Preview</GlimpseTitle>
        <GlimpseDescription>
          This is a longer description that demonstrates how the component handles text that exceeds
          two lines — it will be clamped with an ellipsis to maintain a clean layout.
        </GlimpseDescription>
      </GlimpseContent>
    </Glimpse>
  ),
};
