import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { getChartView } from 'canvas/praxis-api';
import { ChartWidget } from 'canvas/widgets/chart-widget';

vi.mock('canvas/praxis-api', () => ({
  getChartView: vi.fn(),
}));
const mockedGetChartView = vi.mocked(getChartView);

const widget = {
  id: 'w1',
  title: 'Chart',
  size: 'full' as const,
  kind: 'chart' as const,
  view: { chartType: 'kpi' },
};

describe('ChartWidget', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders KPI summary', async () => {
    mockedGetChartView.mockResolvedValue({
      chartType: 'kpi',
      kpi: { value: 4200, trend: 'up', delta: 12, units: '%' },
      series: [],
      metadata: { title: 'KPI' },
    });

    render(<ChartWidget widget={widget} reloadVersion={0} />);
    await waitFor(() => expect(screen.getByText(/4,200 %/)).toBeInTheDocument());
    expect(screen.getByText(/vs last span/i)).toBeInTheDocument();
  });

  it('shows line chart series', async () => {
    mockedGetChartView.mockResolvedValue({
      chartType: 'line',
      series: [
        {
          id: 's1',
          label: 'Throughput',
          points: [
            { label: 'Jan', value: 10 },
            { label: 'Feb', value: 20 },
          ],
        },
      ],
      metadata: {},
    });

    render(<ChartWidget widget={{ ...widget, view: { chartType: 'line' } }} reloadVersion={1} />);
    await waitFor(() => expect(screen.getByLabelText(/Throughput trend/)).toBeInTheDocument());
    expect(screen.getByText(/Jan:10/)).toBeInTheDocument();
  });

  it('falls back to bar chart for other types', async () => {
    mockedGetChartView.mockResolvedValue({
      chartType: 'bar',
      series: [
        {
          id: 's1',
          label: 'Capex',
          color: '#123',
          points: [
            { label: 'Q1', value: 5 },
            { label: 'Q2', value: 15 },
          ],
        },
      ],
      metadata: {},
    });

    render(<ChartWidget widget={{ ...widget, view: { chartType: 'bar' } }} reloadVersion={2} />);
    await waitFor(() => expect(screen.getByText('Q1')).toBeInTheDocument());
    expect(screen.getByText('Capex')).toBeInTheDocument();
  });

  it('renders errors from host', async () => {
    mockedGetChartView.mockRejectedValue(new Error('boom'));
    render(<ChartWidget widget={{ ...widget, view: { chartType: 'kpi' } }} reloadVersion={3} />);
    await waitFor(() => expect(screen.getByText(/boom/)).toBeInTheDocument());
  });
});
