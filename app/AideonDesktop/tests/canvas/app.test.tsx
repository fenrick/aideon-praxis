import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('canvas/components/template-screen/projects-sidebar', () => ({
  ProjectsSidebar: ({ scenarios }: { scenarios: unknown[] }) => (
    <div data-testid="projects-sidebar">{scenarios.length} scenarios</div>
  ),
}));

vi.mock('canvas/components/template-screen/template-header', () => ({
  TemplateHeader: ({
    onTemplateSave,
    onTemplateChange,
    templates,
    activeTemplateId,
  }: {
    onTemplateSave: () => void;
    onTemplateChange: (id: string) => void;
    templates: { id: string }[];
    activeTemplateId: string;
  }) => (
    <div>
      <span data-testid="active-template">{activeTemplateId}</span>
      <span data-testid="template-count">{templates.length}</span>
      <button onClick={onTemplateSave}>Save template</button>
      <button
        onClick={() => {
          onTemplateChange('alt-template');
        }}
      >
        Change template
      </button>
    </div>
  ),
}));

vi.mock('canvas/components/template-screen/scenario-search-bar', () => ({
  ScenarioSearchBar: () => <div data-testid="search-bar" />,
}));

vi.mock('canvas/components/template-screen/overview-tabs', () => ({
  OverviewTabs: ({
    onSelectionChange,
  }: {
    onSelectionChange: (selection: {
      nodeIds: string[];
      edgeIds: string[];
      sourceWidgetId?: string;
    }) => void;
  }) => (
    <div>
      <button
        onClick={() => {
          onSelectionChange({ nodeIds: ['n1'], edgeIds: [], sourceWidgetId: 'widget-1' });
        }}
      >
        simulate-selection
      </button>
    </div>
  ),
}));

vi.mock('canvas/components/template-screen/properties-inspector', () => ({
  PropertiesInspector: ({
    selectionKind,
    selectionId,
  }: {
    selectionKind: string;
    selectionId?: string;
  }) => (
    <div data-testid="inspector">
      {selectionKind}:{selectionId}
    </div>
  ),
}));

vi.mock('canvas/praxis-api', () => ({
  listScenarios: vi.fn(),
}));

vi.mock('canvas/platform', () => ({ isTauri: vi.fn() }));

import { PraxisCanvasSurface } from 'canvas/app';
import { searchStore } from 'canvas/lib/search';
import { isTauri } from 'canvas/platform';
import { listScenarios } from 'canvas/praxis-api';

const listScenariosMock = vi.mocked(listScenarios);
const isTauriMock = vi.mocked(isTauri);

describe('Praxis canvas app shell', () => {
  beforeEach(() => {
    listScenariosMock.mockResolvedValue([
      {
        id: 'mainline',
        name: 'Mainline FY25',
        branch: 'main',
        updatedAt: '2025-01-01T00:00:00Z',
        isDefault: true,
      },
    ]);
    isTauriMock.mockReturnValue(false);
    searchStore.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the shell, fetches scenarios, and shows navigation + header', async () => {
    render(<PraxisCanvasSurface />);

    await waitFor(() => {
      expect(listScenariosMock).toHaveBeenCalled();
    });
    expect(screen.getByTestId('projects-sidebar')).toHaveTextContent('1 scenarios');
    expect(screen.getByTestId('active-template')).toBeInTheDocument();
    expect(screen.getByTestId('search-bar')).toBeInTheDocument();
  });

  it('forwards selection updates to parent callback', async () => {
    const onSelectionChange = vi.fn();

    render(<PraxisCanvasSurface onSelectionChange={onSelectionChange} />);

    await waitFor(() => {
      expect(listScenariosMock).toHaveBeenCalled();
    });
    fireEvent.click(screen.getAllByText('simulate-selection')[0]);

    await waitFor(() => {
      expect(onSelectionChange.mock.calls.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('saves a template via header action', async () => {
    const promptSpy = vi.spyOn(globalThis, 'prompt').mockReturnValue('My Saved Template');

    render(<PraxisCanvasSurface />);

    await waitFor(() => {
      expect(listScenariosMock).toHaveBeenCalled();
    });
    const initialCount = Number(screen.getAllByTestId('template-count')[0]?.textContent);
    fireEvent.click(screen.getAllByText('Save template')[0]);

    await waitFor(() => {
      const updated = Number(screen.getAllByTestId('template-count')[0]?.textContent);
      expect(updated).toBeGreaterThan(initialCount);
    });
    expect(promptSpy).toHaveBeenCalled();
  });
});
