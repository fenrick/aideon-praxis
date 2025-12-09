import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { PanelField, PanelToolbar } from '../../../src/design-system/blocks/panel';

afterEach(() => {
  cleanup();
});

describe('PanelToolbar', () => {
  it('applies justify alignment based on the align prop', () => {
    render(<PanelToolbar data-testid="toolbar-default">Actions</PanelToolbar>);
    render(<PanelToolbar align="start" data-testid="toolbar-start" />);
    render(<PanelToolbar align="between" data-testid="toolbar-between" className="custom" />);

    expect(screen.getByTestId('toolbar-default')).toHaveClass('justify-end');
    expect(screen.getByTestId('toolbar-start')).toHaveClass('justify-start');
    expect(screen.getByTestId('toolbar-between')).toHaveClass('justify-between');
    expect(screen.getByTestId('toolbar-between')).toHaveClass('custom');
  });
});

describe('PanelField', () => {
  it('renders labels, helpers, and action slots', () => {
    render(
      <PanelField label="Data" helper="Save target" action={<span>Action</span>}>
        <input aria-label="Field" />
      </PanelField>,
    );

    expect(screen.getByText('Data')).toBeInTheDocument();
    expect(screen.getByLabelText('Field')).toBeInTheDocument();
    expect(screen.getByText('Save target')).toBeInTheDocument();
    expect(screen.getByText('Action')).toBeInTheDocument();
  });

  it('omits optional helpers when not provided', () => {
    const { queryByText } = render(
      <PanelField label="Data">
        <input aria-label="Field" />
      </PanelField>,
    );

    expect(queryByText('Action')).not.toBeInTheDocument();
    expect(queryByText('Save target')).not.toBeInTheDocument();
  });
});
