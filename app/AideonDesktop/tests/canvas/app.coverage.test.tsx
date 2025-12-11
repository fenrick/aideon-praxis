import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('canvas/components/template-screen/projects-sidebar', () => ({
  ProjectsSidebar: ({ projects, error, onRetry }: any) => (
    <div>
      <div data-testid="projects-count">{projects.length}</div>
      {error ? <div data-testid="projects-error">{error}</div> : null}
      <button data-testid="retry-projects" onClick={() => onRetry?.()}>
        retry
      </button>
    </div>
  ),
}));
vi.mock('canvas/components/template-screen/template-header', () => ({
  TemplateHeader: ({ onTemplateSave, onCreateWidget }: any) => (
    <div>
      <button onClick={() => onTemplateSave?.()} data-testid="save-template">
        save
      </button>
      <button onClick={() => onCreateWidget?.()} data-testid="open-library">
        add
      </button>
    </div>
  ),
}));
vi.mock('canvas/components/template-screen/scenario-search-bar', () => ({
  ScenarioSearchBar: ({ onScenarioChange }: any) => (
    <button onClick={() => onScenarioChange?.('alt')} data-testid="scenario-change">
      scenario
    </button>
  ),
}));
vi.mock('canvas/components/template-screen/overview-tabs', () => ({
  OverviewTabs: ({ onSelectionChange, reloadSignal }: any) => (
    <div>
      <button
        data-testid="select-node"
        onClick={() =>
          onSelectionChange({ nodeIds: ['n1'], edgeIds: [], sourceWidgetId: undefined })
        }
      >
        select
      </button>
      <span data-testid="reload-signal">{reloadSignal ?? 0}</span>
    </div>
  ),
}));
vi.mock('canvas/components/template-screen/properties-inspector', () => ({
  PropertiesInspector: ({ selectionKind, selectionId, onSave, onReset }: any) => (
    <div data-testid="inspector">
      <div data-testid="selection-kind">
        {selectionKind}:{selectionId ?? ''}
      </div>
      <button
        data-testid="inspector-save"
        onClick={() => onSave?.({ name: 'Node name', dataSource: 'ds1' })}
      >
        save
      </button>
      <button data-testid="inspector-reset" onClick={() => onReset?.()}>
        reset
      </button>
    </div>
  ),
}));
vi.mock('canvas/components/template-screen/praxis-shell-layout', () => ({
  PraxisShellLayout: ({ navigation, toolbar, content, inspector }: any) => (
    <div data-testid="layout">
      <div data-testid="toolbar">{toolbar}</div>
      <div data-testid="sidebar">{navigation}</div>
      <div data-testid="content">{content}</div>
      <div data-testid="inspector">{inspector}</div>
    </div>
  ),
}));
vi.mock('canvas/components/debug-overlay', () => ({
  DebugOverlay: ({ visible }: any) => (visible ? <div data-testid="debug">debug</div> : null),
}));
vi.mock('canvas/templates', async () => {
  const actual = await vi.importActual<typeof import('canvas/templates')>('canvas/templates');
  return {
    ...actual,
    BUILT_IN_TEMPLATES: [{ id: 't1', name: 'Template 1', description: '', widgets: [] }],
  };
});

const registryMock = vi.fn(() => [
  { id: 'w1', label: 'Graph', defaultView: { kind: 'graph' }, defaultSize: 'full', type: 'graph' },
]);
vi.mock('canvas/widgets/registry', () => ({
  listWidgetRegistry: () => registryMock(),
}));
vi.mock('canvas/praxis-api', () => {
  const listScenarios = vi
    .fn()
    .mockResolvedValue([
      { id: 's1', name: 'Scenario 1', branch: 'main', updatedAt: '', isDefault: true },
    ]);
  const applyOperations = vi.fn().mockResolvedValue(undefined);
  return { listScenarios, applyOperations };
});
vi.mock('canvas/domain-data', () => ({
  listProjectsWithScenarios: vi.fn().mockResolvedValue([
    {
      id: 'p1',
      name: 'Proj',
      scenarios: [{ id: 's1', name: 'Scenario 1', branch: 'main', updatedAt: '', isDefault: true }],
    },
  ]),
  listTemplatesFromHost: vi
    .fn()
    .mockResolvedValue([{ id: 't1', name: 'Template 1', description: '', widgets: [] }]),
}));
vi.mock('canvas/platform', () => ({ isTauri: vi.fn(() => false) }));
vi.mock('canvas/time/use-temporal-panel', () => ({
  useTemporalPanel: () => [
    { branch: 'main', commitId: undefined, loading: false },
    { refresh: vi.fn() },
  ],
}));
vi.mock('canvas/lib/analytics', () => ({ track: vi.fn() }));

import { PraxisCanvasSurface } from 'canvas/app';
import { listProjectsWithScenarios, listTemplatesFromHost } from 'canvas/domain-data';

describe('PraxisCanvasSurface (coverage)', () => {
  it('loads projects/templates, wires selection and saves templates', async () => {
    const onSelectionChange = vi.fn();
    render(<PraxisCanvasSurface onSelectionChange={onSelectionChange} debug />);

    await waitFor(() => expect(listTemplatesFromHost).toHaveBeenCalled());
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('select-node'));
    expect(onSelectionChange).toHaveBeenCalledWith({
      nodeIds: ['n1'],
      edgeIds: [],
      sourceWidgetId: undefined,
    });

    fireEvent.click(screen.getByTestId('save-template'));
    await waitFor(() => expect(listTemplatesFromHost).toHaveBeenCalledTimes(2));
  });

  it('changes scenarios', async () => {
    render(<PraxisCanvasSurface />);
    await waitFor(() => expect(listProjectsWithScenarios).toHaveBeenCalled());
    fireEvent.click(screen.getAllByTestId('scenario-change')[0]);
    expect(screen.getAllByTestId('reload-signal')[0]).toHaveTextContent('0');
  });

  it('opens widget library and creates widgets; handles empty registry', async () => {
    render(<PraxisCanvasSurface />);
    await waitFor(() => expect(screen.getAllByTestId('layout')[0]).toBeInTheDocument());

    fireEvent.click(screen.getAllByTestId('open-library')[0]);
    const widgetButton = await screen.findByText('Graph');
    fireEvent.click(widgetButton);

    registryMock.mockReturnValueOnce([]);
    fireEvent.click(screen.getAllByTestId('open-library')[0]);
    expect(await screen.findByText(/No widget types registered/)).toBeInTheDocument();
  });

  it('invokes inspector save and applies operations for node selection', async () => {
    const { applyOperations } = await import('canvas/praxis-api');
    render(<PraxisCanvasSurface />);
    await waitFor(() => expect(listProjectsWithScenarios).toHaveBeenCalled());
    fireEvent.click(screen.getAllByTestId('select-node')[0]);
    fireEvent.click((await screen.findAllByTestId('inspector-save'))[0]);
    await waitFor(() => expect(applyOperations).toHaveBeenCalled());
  });

  // negative paths covered in dedicated files; keep this focused on happy-path wiring
});
