import { fireEvent, render, screen } from '@testing-library/react';
import type * as React from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { TemporalPanelActions, TemporalPanelState } from 'canvas/time/use-temporal-panel';

import { TimeCursorCard } from 'canvas/components/template-screen/time-cursor-card';

vi.mock('design-system/components/ui/select', () => {
  interface SelectProperties {
    onValueChange?: (value: string) => void;
    value?: string;
    disabled?: boolean;
    children?: React.ReactNode;
    ['data-testid']?: string;
  }
  const Select = ({
    onValueChange,
    value,
    disabled,
    children,
    'data-testid': testId,
  }: SelectProperties) => (
    <div>
      <button
        data-testid={testId ?? `select-${value ?? 'unset'}`}
        disabled={disabled}
        onClick={() => {
          const nextValue = testId?.includes('branch') ? 'main' : 'c1';
          onValueChange?.(nextValue);
        }}
      >
        select
      </button>
      {children}
    </div>
  );
  const SelectTrigger = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  const SelectValue = (properties: Record<string, unknown>) => <div {...properties} />;
  const SelectContent = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  const SelectItem = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  return { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
});

vi.mock('design-system/components/ui/slider', () => ({
  Slider: ({ onValueCommit }: { onValueCommit?: (values: number[]) => void }) => (
    <button data-testid="timeline-slider" onClick={() => onValueCommit?.([1])}>
      slider
    </button>
  ),
}));

describe('TimeCursorCard', () => {
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
    snapshot: { nodes: 42, edges: 10, confidence: 0.9, scenario: 'chronaplay' },
    loading: false,
    snapshotLoading: false,
    error: undefined,
    mergeConflicts: undefined,
    merging: false,
  } as TemporalPanelState;

  const actions: TemporalPanelActions = {
    selectBranch: vi.fn().mockResolvedValue(),
    selectCommit: vi.fn().mockResolvedValue(),
    refreshBranches: vi.fn().mockResolvedValue(),
    mergeIntoMain: vi.fn().mockResolvedValue(),
  };

  it('emits branch, commit, and slider changes', () => {
    render(<TimeCursorCard state={state} actions={actions} />);

    fireEvent.click(screen.getByTestId('branch-select'));
    expect(actions.selectBranch).toHaveBeenCalledWith('main');

    fireEvent.click(screen.getByTestId('commit-select'));
    expect(actions.selectCommit).toHaveBeenCalledWith('c1');

    fireEvent.click(screen.getByTestId('timeline-slider'));
    expect(actions.selectCommit).toHaveBeenCalledWith('c2');
  });
});
