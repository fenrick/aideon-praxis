import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import {
  Panel,
  PanelContent,
  PanelField,
  PanelFooter,
  PanelHeader,
  PanelTitle,
  PanelToolbar,
} from '../../src/design-system/blocks/panel';

describe('design-system panel blocks', () => {
  afterEach(() => {
    cleanup();
  });

  it('applies structural styling while merging custom classes', () => {
    render(
      <Panel data-testid="panel" className="shadow-lg">
        <PanelHeader data-testid="panel-header">
          <PanelTitle data-testid="panel-title">Panel Title</PanelTitle>
        </PanelHeader>
        <PanelContent data-testid="panel-content">Body content</PanelContent>
        <PanelFooter data-testid="panel-footer">Footer actions</PanelFooter>
      </Panel>,
    );

    expect(screen.getByTestId('panel')).toHaveClass(
      'rounded-2xl',
      'bg-card',
      'shadow-lg',
    );
    expect(screen.getByTestId('panel-header')).toHaveClass('border-b', 'pb-4');
    expect(screen.getByTestId('panel-title')).toHaveClass('text-base', 'font-semibold');
    expect(screen.getByTestId('panel-content')).toHaveClass('pt-4', 'space-y-4');
    expect(screen.getByTestId('panel-footer')).toHaveClass('justify-end', 'gap-2');
  });

  it('renders labeled fields with optional helper and action slots', () => {
    render(
      <PanelField
        data-testid="panel-field"
        label="Details"
        helper="Helper copy"
        action={<button type="button">Action</button>}
      >
        <div>Field child</div>
      </PanelField>,
    );

    expect(screen.getByTestId('panel-field')).toHaveClass('space-y-2');
    expect(screen.getByText('Details')).toBeInTheDocument();
    expect(screen.getByText('Field child')).toBeInTheDocument();
    expect(screen.getByText('Helper copy')).toHaveClass('text-xs', 'text-muted-foreground');
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
  });

  it('aligns panel toolbars based on the provided alignment token', () => {
    const { rerender } = render(
      <PanelToolbar data-testid="panel-toolbar">Toolbar content</PanelToolbar>,
    );

    expect(screen.getByTestId('panel-toolbar')).toHaveClass('justify-end');

    rerender(
      <PanelToolbar data-testid="panel-toolbar" align="start">
        Toolbar content
      </PanelToolbar>,
    );
    expect(screen.getByTestId('panel-toolbar')).toHaveClass('justify-start');

    rerender(
      <PanelToolbar data-testid="panel-toolbar" align="between">
        Toolbar content
      </PanelToolbar>,
    );
    expect(screen.getByTestId('panel-toolbar')).toHaveClass('justify-between');
  });
});
