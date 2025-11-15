import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { TemporalPanelActions, TemporalPanelState } from '@/time/use-temporal-panel';

import { TimeControlPanel } from '@/components/blocks/time-control-panel';

vi.mock('@/components/ui/select', () => {
  const Select = ({ onValueChange, value, disabled, children }: any) => (
    <div>
      <button
        data-testid={`select-${value ?? 'unset'}`}
        disabled={disabled}
        onClick={() => onValueChange?.('main')}
      >
        select
      </button>
      {children}
    </div>
  );
  const SelectTrigger = ({ children }: any) => <div>{children}</div>;
  const SelectValue = (properties: any) => <div {...properties} />;
  const SelectContent = ({ children }: any) => <div>{children}</div>;
  const SelectItem = ({ children }: any) => <div>{children}</div>;
  return { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
});

vi.mock('@/components/ui/slider', () => ({
  Slider: ({ onValueCommit }: any) => (
    <button data-testid="slider" onClick={() => onValueCommit?.([1])}>
      slider
    </button>
  ),
}));

describe('TimeControlPanel', () => {
  const state: TemporalPanelState = {
    branches: [
      { name: 'main', head: 'a1' },
      { name: 'chronaplay', head: 'b1' },
    ],
    branch: 'chronaplay',
    commits: [
      {
        id: 'c1',
        branch: 'chronaplay',
        parents: [],
        message: 'Seed',
        tags: [],
        changeCount: 1,
      },
      {
        id: 'c2',
        branch: 'chronaplay',
        parents: ['c1'],
        message: 'Add UI',
        tags: ['ui'],
        changeCount: 3,
      },
    ],
    commitId: 'c1',
    snapshot: { nodes: 42, edges: 10 },
    loading: false,
    snapshotLoading: false,
    error: undefined,
    mergeConflicts: undefined,
    merging: false,
  } as TemporalPanelState;

  const actions: TemporalPanelActions = {
    selectBranch: vi.fn(),
    selectCommit: vi.fn(),
    refreshBranches: vi.fn(),
    mergeIntoMain: vi.fn(),
  };

  it('invokes actions from buttons and slider', () => {
    render(<TimeControlPanel state={state} actions={actions} />);

    fireEvent.click(screen.getByText('Refresh branches'));
    expect(actions.refreshBranches).toHaveBeenCalled();

    fireEvent.click(screen.getByText('Reload snapshot'));
    expect(actions.selectCommit).toHaveBeenCalledWith('c1');

    fireEvent.click(screen.getByText('Merge into main'));
    expect(actions.mergeIntoMain).toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('slider'));
    expect(actions.selectCommit).toHaveBeenCalledWith('c2');
  });
});
