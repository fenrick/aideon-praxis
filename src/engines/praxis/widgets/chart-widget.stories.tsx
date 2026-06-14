import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { ChartWidget } from './chart-widget';

const baseKpiWidget = {
  id: 'widget-chart-kpi',
  kind: 'chart' as const,
  title: 'Operational KPIs',
  size: 'half' as const,
  view: {
    id: 'kpi-operational',
    name: 'Operational KPIs',
    kind: 'chart' as const,
    asOf: '2025-06-01T00:00:00Z',
    scenario: 'main',
    chartType: 'kpi' as const,
    measure: 'Operational readiness',
  },
};

const meta = {
  component: ChartWidget,
  tags: ['autodocs'],
  title: 'Workspaces/Praxis/Widgets/ChartWidget',
  parameters: {
    docs: {
      description: {
        component:
          'Renders KPI, line, or bar chart views. Calls Tauri IPC to load data — shows a loading state until data arrives.',
      },
    },
  },
} satisfies Meta<typeof ChartWidget>;

export default meta;

type Story = StoryObj<typeof meta>;

export const KpiChart: Story = {
  args: {
    widget: baseKpiWidget,
    reloadVersion: 0,
  },
};

export const LineChart: Story = {
  args: {
    widget: {
      ...baseKpiWidget,
      id: 'widget-chart-line',
      title: 'Velocity trend',
      view: {
        ...baseKpiWidget.view,
        id: 'velocity-line',
        name: 'Velocity trend',
        chartType: 'line' as const,
        measure: 'Velocity',
      },
    },
    reloadVersion: 0,
  },
};

export const BarChart: Story = {
  args: {
    widget: {
      ...baseKpiWidget,
      id: 'widget-chart-bar',
      title: 'Capability maturity',
      view: {
        ...baseKpiWidget.view,
        id: 'maturity-bar',
        name: 'Capability maturity',
        chartType: 'bar' as const,
        measure: 'Maturity',
      },
    },
    reloadVersion: 0,
  },
};
