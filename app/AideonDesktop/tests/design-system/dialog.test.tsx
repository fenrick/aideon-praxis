import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../src/design-system/ui/dialog';

describe('design-system dialog', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders dialog structure with header, description, and footer actions', () => {
    render(
      <Dialog open>
        <DialogContent data-testid="dialog-content">
          <DialogHeader data-testid="dialog-header">
            <DialogTitle data-testid="dialog-title">Dialog title</DialogTitle>
            <DialogDescription data-testid="dialog-description">
              Supporting copy
            </DialogDescription>
          </DialogHeader>
          <div data-testid="dialog-body">Body content</div>
          <DialogFooter data-testid="dialog-footer">
            <button type="button">Confirm</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>,
    );

    expect(screen.getByTestId('dialog-content')).toHaveAttribute('data-slot', 'dialog-content');
    expect(screen.getByTestId('dialog-header')).toHaveAttribute('data-slot', 'dialog-header');
    expect(screen.getByTestId('dialog-title')).toHaveClass('text-lg', 'font-semibold');
    expect(screen.getByTestId('dialog-description')).toHaveClass('text-muted-foreground', 'text-sm');
    expect(screen.getByTestId('dialog-body')).toBeInTheDocument();
    expect(screen.getByTestId('dialog-footer')).toHaveClass('flex');
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    expect(document.querySelector('[data-slot="dialog-overlay"]')).toHaveClass('bg-black/50');
  });

  it('omits the close control when requested and merges custom classes', () => {
    render(
      <Dialog open>
        <DialogContent data-testid="dialog-content" showCloseButton={false} className="gap-2">
          <DialogHeader>
            <DialogTitle>Modal title</DialogTitle>
            <DialogDescription>Modal description</DialogDescription>
          </DialogHeader>
          <div>Body</div>
        </DialogContent>
      </Dialog>,
    );

    expect(screen.getByTestId('dialog-content')).toHaveClass('gap-2');
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();
    expect(document.querySelector('[data-slot="dialog-overlay"]')).toBeInTheDocument();
  });
});
