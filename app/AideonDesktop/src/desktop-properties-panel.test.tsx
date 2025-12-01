import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DesktopPropertiesPanel } from './desktop-properties-panel';

describe('DesktopPropertiesPanel', () => {
  it('shows empty-state when nothing is selected', () => {
    render(<DesktopPropertiesPanel />);

    expect(screen.getByText(/No selection yet/i)).toBeTruthy();
  });

  it('summarises node and edge counts', () => {
    render(
      <DesktopPropertiesPanel
        selection={{ sourceWidgetId: 'test', nodeIds: ['n1', 'n2'], edgeIds: ['e1'] }}
      />,
    );

    expect(screen.getByText((_, node) => node?.textContent === 'Nodes selected: 2')).toBeTruthy();
    expect(screen.getByText((_, node) => node?.textContent === 'Edges selected: 1')).toBeTruthy();
    expect(screen.getByText(/Source widget: test/)).toBeTruthy();
  });
});
