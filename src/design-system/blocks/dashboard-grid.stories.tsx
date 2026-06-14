import type { Meta } from '@storybook/nextjs-vite';

import { DashboardGrid } from './dashboard-grid';
import { WidgetFrame } from './widget-frame';

const meta = {
  component: DashboardGrid,
  tags: ['autodocs'],
} satisfies Meta<typeof DashboardGrid>;

export default meta;

export const TwoColumns = {
  name: '2 columns',
  render: () => (
    <DashboardGrid columns={2}>
      <WidgetFrame title="Metric A" state="ready">
        <div className="h-24" />
      </WidgetFrame>
      <WidgetFrame title="Metric B" state="loading" />
      <WidgetFrame title="Metric C" state="empty" emptyTitle="No data" />
      <WidgetFrame title="Metric D" state="error" errorMessage="Fetch failed" />
    </DashboardGrid>
  ),
};
