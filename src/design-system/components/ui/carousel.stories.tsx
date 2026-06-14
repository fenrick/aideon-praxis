import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from './carousel';
import { Card, CardContent } from './card';

const meta = {
  component: Carousel,
  tags: ['autodocs'],
} satisfies Meta<typeof Carousel>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="px-16 w-96">
      <Carousel>
        <CarouselContent>
          {Array.from({ length: 5 }).map((_, i) => (
            <CarouselItem key={i}>
              <Card>
                <CardContent className="flex aspect-square items-center justify-center p-6">
                  <span className="text-4xl font-semibold">{i + 1}</span>
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  ),
};

export const MultipleItems: Story = {
  render: () => (
    <div className="px-16 w-96">
      <Carousel opts={{ align: 'start' }}>
        <CarouselContent>
          {Array.from({ length: 6 }).map((_, i) => (
            <CarouselItem key={i} className="basis-1/3">
              <Card>
                <CardContent className="flex aspect-square items-center justify-center p-2">
                  <span className="text-xl font-semibold">{i + 1}</span>
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  ),
};
