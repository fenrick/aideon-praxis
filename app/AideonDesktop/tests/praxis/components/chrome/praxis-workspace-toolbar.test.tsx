import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { PraxisWorkspaceToolbar } from 'praxis/components/chrome/praxis-workspace-toolbar';
import type { TemporalPanelActions, TemporalPanelState } from 'praxis/time/use-temporal-panel';

const toastMessage = vi.fn();
const search = vi.fn();
const clear = vi.fn();

vi.mock('sonner', () => ({
  toast: {
    message: (...arguments_: unknown[]) => {
      toastMessage(...arguments_);
    },
  },
}));

vi.mock('praxis/lib/search', () => ({
  searchStore: {
    search: (...arguments_: unknown[]) => {
      search(...arguments_);
    },
    clear: (...arguments_: unknown[]) => {
      clear(...arguments_);
    },
  },
}));

vi.mock('praxis/platform', () => ({ isTauri: () => false }));

vi.mock('aideon/shell/aideon-toolbar', () => ({
  AideonToolbar: ({
    start,
    center,
    end,
    onShellCommand,
  }: {
    readonly start?: ReactNode;
    readonly center?: ReactNode;
    readonly end?: ReactNode;
    readonly onShellCommand?: (command: string, payload?: unknown) => void;
  }) => (
    <div>
      <button
        type="button"
        onClick={() => onShellCommand?.('file.open', { path: '/var/empty/example.txt' })}
      >
        simulate-open
      </button>
      {start}
      {center}
      {end}
    </div>
  ),
}));

describe('PraxisWorkspaceToolbar', () => {
  it('dispatches search queries and handles shell file commands', () => {
    const temporalState = {} as unknown as TemporalPanelState;
    const temporalActions = {} as unknown as TemporalPanelActions;
    const onTemplateChange = vi.fn();
    const onTemplateSave = vi.fn();
    const onCreateWidget = vi.fn();

    render(
      <PraxisWorkspaceToolbar
        scenarioName="Scenario"
        templates={[]}
        activeTemplateId=""
        onTemplateChange={onTemplateChange}
        onTemplateSave={onTemplateSave}
        onCreateWidget={onCreateWidget}
        temporalState={temporalState}
        temporalActions={temporalActions}
      />,
    );

    fireEvent.click(screen.getByText('simulate-open'));
    expect(toastMessage).toHaveBeenCalledTimes(1);

    const input = screen.getByLabelText('Search');
    fireEvent.change(input, { target: { value: 'Node' } });
    expect(search).toHaveBeenCalledWith('Node');

    fireEvent.change(input, { target: { value: '' } });
    expect(clear).toHaveBeenCalledTimes(1);
  });
});
