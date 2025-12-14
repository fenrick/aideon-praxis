import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PropertiesInspector } from 'canvas/components/template-screen/properties-inspector';

describe('PropertiesInspector', () => {
  it('shows empty state when nothing is selected', () => {
    render(<PropertiesInspector selectionKind="none" />);

    expect(
      screen.getAllByText(/select a widget, node or edge to edit its properties/i).length,
    ).toBeGreaterThan(0);
  });

  it('renders widget fields when a widget is selected', () => {
    render(
      <PropertiesInspector
        selectionKind="widget"
        selectionId="widget-1"
        properties={{ name: 'Widget 1' }}
      />,
    );

    expect(screen.getByText(/widget properties/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue(/Widget 1/i)).toBeInTheDocument();
  });
});
