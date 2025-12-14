import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DebugOverlay } from 'canvas/components/debug-overlay';

vi.mock('canvas/lib/analytics', () => ({
  recentAnalytics: vi.fn(() => [
    { event: 'selection.change', payload: { nodes: 1 }, at: 1 },
    { event: 'time.cursor', payload: { branch: 'main' }, at: 2 },
  ]),
}));

describe('DebugOverlay', () => {
  it('hides when not visible', () => {
    const { container } = render(<DebugOverlay visible={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders selection info and recent analytics', () => {
    render(
      <DebugOverlay
        visible
        scenarioName="Scenario A"
        templateName="Template 1"
        branch="main"
        commitId="c1"
        selection={{ nodeIds: ['n1', 'n2'], edgeIds: [], sourceWidgetId: undefined }}
      />,
    );

    expect(screen.getByText('Scenario A')).toBeInTheDocument();
    expect(screen.getByText('2 node(s)')).toBeInTheDocument();
    expect(screen.getByText('selection.change')).toBeInTheDocument();
    expect(screen.getByText('time.cursor')).toBeInTheDocument();
  });
});
