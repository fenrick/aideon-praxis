import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardAction,
} from './card';
import { Button } from './button';

const meta = {
  component: Card,
  tags: ['autodocs'],
} satisfies Meta<typeof Card>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>Temporal State</CardTitle>
        <CardDescription>View the graph as of a specific date.</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Select a date to explore the historical state of the architecture twin.</p>
      </CardContent>
      <CardFooter className="gap-2">
        <Button variant="outline">Cancel</Button>
        <Button>Apply</Button>
      </CardFooter>
    </Card>
  ),
};

export const WithAction: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>Scenario</CardTitle>
        <CardDescription>2026 Target State</CardDescription>
        <CardAction>
          <Button variant="ghost" size="icon-sm">…</Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p>A future-state scenario branching from the baseline plan.</p>
      </CardContent>
    </Card>
  ),
};

export const SmallSize: Story = {
  render: () => (
    <Card className="w-64" size="sm">
      <CardHeader>
        <CardTitle>Small Card</CardTitle>
      </CardHeader>
      <CardContent>Compact content area.</CardContent>
    </Card>
  ),
};
