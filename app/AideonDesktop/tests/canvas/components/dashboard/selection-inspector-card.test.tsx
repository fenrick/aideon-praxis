import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SelectionInspectorCard } from 'canvas/components/dashboard/selection-inspector-card';
import type { SelectionState } from 'canvas/types';

const sampleSelection: SelectionState = {
  nodeIds: ['n1', 'n2', 'n3'],
  edgeIds: ['e1'],
  sourceWidgetId: 'w1',
};

const widgets = [{ id: 'w1', title: 'Graph', kind: 'graph' } as any];

describe('SelectionInspectorCard', () => {
  it('shows empty state and disables clear', () => {
    render(
      <SelectionInspectorCard
        selection={{ nodeIds: [], edgeIds: [], sourceWidgetId: undefined }}
        widgets={widgets}
      />,
    );

    expect(screen.getByText(/Select nodes/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Clear/ })).toBeDisabled();
  });

  it('renders selection details and clears via callback', () => {
    const onSelectionChange = vi.fn();
    render(
      <SelectionInspectorCard
        selection={sampleSelection}
        widgets={widgets}
        onSelectionChange={onSelectionChange}
      />,
    );

    expect(screen.getByText(/3 nodes/)).toBeInTheDocument();
    expect(screen.getByText(/Source:Graph/)).toBeInTheDocument();
    expect(screen.getByText('n1')).toBeInTheDocument();
    expect(screen.getByText('e1')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: /Clear/ }).find((btn) => !btn.disabled)!);
    expect(onSelectionChange).toHaveBeenCalledWith({
      nodeIds: [],
      edgeIds: [],
      sourceWidgetId: undefined,
    });
  });
});
