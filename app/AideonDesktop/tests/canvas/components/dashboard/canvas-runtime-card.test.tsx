import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('canvas/canvas-runtime', () => ({
  CanvasRuntime: ({
    reloadVersion,
    onGraphViewChange,
    onGraphError,
    onSelectionChange,
  }: any) => (
    <div data-testid="canvas-runtime" data-reload={reloadVersion}>
      <button
        data-testid="emit-view"
        onClick={() =>
          onGraphViewChange?.({
            view: {
              metadata: { asOf: '2025-01-01T00:00:00Z', scenario: 'dev' },
              stats: { nodes: 12, edges: 4 },
            },
          })
        }
      />
      <button data-testid="emit-error" onClick={() => onGraphError?.({ message: 'boom' })} />
      <button
        data-testid="emit-selection"
        onClick={() =>
    onSelectionChange?.({ nodeIds: ['n1'], edgeIds: [], widgetId: 'w1' })
        }
      />
    </div>
  ),
}));

import { CanvasRuntimeCard } from 'canvas/components/dashboard/canvas-runtime-card';

describe('CanvasRuntimeCard', () => {
  it('renders stats and handles graph events', () => {
    const onSelectionChange = vi.fn();

    render(
      <CanvasRuntimeCard
        widgets={[{ id: 'w1' } as any]}
        selection={{ nodeIds: [], edgeIds: [] }}
        onSelectionChange={onSelectionChange}
      />,
    );

    expect(screen.getByText('Canvas runtime')).toBeInTheDocument();
    expect(screen.getByText(/React Flow GraphWidget/)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('emit-view'));
    expect(screen.getByText(/Nodes/).nextSibling).toHaveTextContent('12');
    expect(screen.getByText(/Edges/).nextSibling).toHaveTextContent('4');
    expect(screen.getByText(/dev/)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('emit-selection'));
    expect(onSelectionChange).toHaveBeenCalledWith({
      nodeIds: ['n1'],
      edgeIds: [],
      sourceWidgetId: 'w1',
    });

    fireEvent.click(screen.getByTestId('emit-error'));
    expect(screen.getByText('boom')).toBeInTheDocument();
  });

  it('disables refresh when no widgets and increments reload version when clicked', () => {
    const { container, unmount } = render(
      <CanvasRuntimeCard widgets={[]} selection={{ nodeIds: [], edgeIds: [] }} />,
    );
    const refreshButtons = Array.from(container.querySelectorAll('button')).filter((btn) =>
      /Refresh graph/i.test(btn.textContent ?? ''),
    );
    expect(refreshButtons.some((button) => button.hasAttribute('disabled'))).toBe(true);
    unmount();

    const { container: container2, getAllByTestId } = render(
      <CanvasRuntimeCard widgets={[{ id: 'w1' } as any]} selection={{ nodeIds: [], edgeIds: [] }} />,
    );
    const refresh = Array.from(container2.querySelectorAll('button')).find((btn) =>
      /Refresh graph/i.test(btn.textContent ?? ''),
    );
    fireEvent.click(refresh!);
    const runtimes = getAllByTestId('canvas-runtime');
    expect(runtimes.some((el) => el.getAttribute('data-reload') === '1')).toBe(true);
  });
});
