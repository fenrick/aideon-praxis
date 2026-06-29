import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PraxisCanvasWorkspace } from './praxis-canvas-workspace';

vi.mock('aideon/canvas/canvas-runtime', () => ({
  AideonCanvasRuntime: () => <div data-testid="canvas-runtime" />,
}));

const baseProps = {
  widgets: [],
  selection: { sourceWidgetId: undefined, nodeIds: [], edgeIds: [], cellIds: [] },
} as const;

describe('PraxisCanvasWorkspace', () => {
  describe('empty state', () => {
    it('shows an empty-state prompt when there are no widgets', () => {
      render(<PraxisCanvasWorkspace {...baseProps} />);
      expect(screen.getByText(/nothing on this page yet/i)).toBeInTheDocument();
    });

    it('offers a primary action to add a widget', () => {
      const onAddWidget = vi.fn();
      render(<PraxisCanvasWorkspace {...baseProps} onAddWidget={onAddWidget} />);
      const addButton = screen.getByRole('button', { name: /add widget/i });
      addButton.click();
      expect(onAddWidget).toHaveBeenCalledOnce();
    });
  });

  describe('stale state', () => {
    it('renders no stale badge when stale is not set', () => {
      render(<PraxisCanvasWorkspace {...baseProps} />);
      expect(screen.queryByText(/stale/i)).toBeNull();
    });

    it('renders a stale badge when stale=true', () => {
      render(<PraxisCanvasWorkspace {...baseProps} stale />);
      expect(screen.getByText(/stale/i)).toBeInTheDocument();
    });
  });

  describe('rebuilding state', () => {
    it('renders no rebuilding indicator when rebuilding is not set', () => {
      render(<PraxisCanvasWorkspace {...baseProps} />);
      expect(screen.queryByText(/rebuilding/i)).toBeNull();
    });

    it('renders a rebuilding indicator when rebuilding=true', () => {
      render(<PraxisCanvasWorkspace {...baseProps} rebuilding />);
      expect(screen.getByText(/rebuilding/i)).toBeInTheDocument();
    });
  });

  describe('partial state', () => {
    it('renders no PartialBanner when partialMessage is not set', () => {
      render(<PraxisCanvasWorkspace {...baseProps} />);
      expect(screen.queryByText(/partial result/i)).toBeNull();
    });

    it('renders a PartialBanner when partialMessage is set', () => {
      render(
        <PraxisCanvasWorkspace
          {...baseProps}
          partialMessage="Showing top 100 of 2 400 nodes. Zoom in to see more."
        />,
      );
      expect(screen.getByText(/partial result/i)).toBeInTheDocument();
      expect(screen.getByText(/Showing top 100 of 2 400 nodes/)).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('renders an alert region when errorMessage is set', () => {
      render(<PraxisCanvasWorkspace {...baseProps} errorMessage="Graph load failed" />);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('includes the error message text in the alert region', () => {
      render(<PraxisCanvasWorkspace {...baseProps} errorMessage="Timeout on projection" />);
      expect(screen.getByRole('alert')).toHaveTextContent('Timeout on projection');
    });
  });
});
