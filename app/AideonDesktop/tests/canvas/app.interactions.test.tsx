import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const undo = vi.fn();
const redo = vi.fn();
const selectCommit = vi.fn();
const resetProperties = vi.fn();

vi.mock('canvas/stores/selection-store', () => {
  const selection = { nodeIds: ['n1'], edgeIds: [], sourceWidgetId: 'w1' };
  const properties = { n1: { name: 'Node', dataSource: 'ds', layout: 'grid', description: 'd' } };
  return {
    SelectionProvider: ({ children }: { children: ReactNode }) => (
      <span data-testid="selection-provider">{children}</span>
    ),
    useSelectionStore: () => ({
      state: { selection, properties },
      setSelection: vi.fn(),
      setFromWidget: vi.fn(),
      clear: vi.fn(),
      updateProperties: vi.fn(),
      resetProperties,
    }),
    deriveSelectionKind: vi.fn(() => 'node'),
    primarySelectionId: vi.fn(() => 'n1'),
  };
});

vi.mock('canvas/hooks/use-command-stack', () => ({
  useCommandStack: () => ({
    record: vi.fn(),
    undo,
    redo,
  }),
}));

vi.mock('canvas/time/use-temporal-panel', () => ({
  useTemporalPanel: () => [
    {
      branch: 'main',
      commitId: 'c1',
      loading: false,
      commits: [
        { id: 'c1', message: 'first', parents: [], branch: 'main', tags: [], changeCount: 1 },
        { id: 'c2', message: 'second', parents: ['c1'], branch: 'main', tags: [], changeCount: 1 },
      ],
    },
    { refresh: vi.fn(), selectCommit },
  ],
}));

const templateError = vi.fn<[], boolean>();
const projectError = vi.fn<[], boolean>();

vi.mock('canvas/domain-data', () => ({
  listProjectsWithScenarios: () => {
    const shouldFail = Boolean(projectError());
    if (shouldFail) {
      return Promise.reject(new Error('projects-failed'));
    }
    return Promise.resolve([
      {
        id: 'p1',
        name: 'Proj',
        scenarios: [{ id: 's1', name: 'Scenario', branch: 'main', updatedAt: '', isDefault: true }],
      },
    ]);
  },
  listTemplatesFromHost: () => {
    const shouldFail = Boolean(templateError());
    if (shouldFail) {
      return Promise.reject(new Error('templates-failed'));
    }
    return Promise.resolve([{ id: 't1', name: 'Template 1', description: '', widgets: [] }]);
  },
}));

const templateSpy = vi.fn<(templates: { id: string; name: string }[]) => void>();

vi.mock('canvas/templates', () => ({
  BUILT_IN_TEMPLATES: [{ id: 'fallback', name: 'Fallback', description: 'built-in', widgets: [] }],
  instantiateTemplate: vi.fn(() => []),
  captureTemplateFromWidgets: vi.fn((name: string) => ({
    id: `${name}-id`,
    name,
    description: '',
    widgets: [],
  })),
}));

vi.mock('canvas/widgets/registry', () => ({
  listWidgetRegistry: () => [],
}));

vi.mock('canvas/praxis-api', () => ({
  applyOperations: vi.fn().mockResolvedValue(),
}));

vi.mock('canvas/components/template-screen/projects-sidebar', () => ({
  ProjectsSidebar: ({
    projects,
    error,
    onRetry,
  }: {
    projects: unknown[];
    error?: string;
    onRetry?: () => void;
  }) => (
    <div>
      <span data-testid="project-count">{projects.length}</span>
      {error ? <p data-testid="projects-error">{error}</p> : undefined}
      <button data-testid="retry-projects" onClick={() => onRetry?.()}>
        retry
      </button>
    </div>
  ),
}));

vi.mock('canvas/components/template-screen/template-header', () => ({
  TemplateHeader: ({
    onTemplateChange,
    templates = [],
  }: {
    onTemplateChange?: (templateId: string) => void;
    templates?: { id: string; name: string }[];
  }) => {
    templateSpy(templates);
    return (
      <button data-testid="change-template" onClick={() => onTemplateChange?.('alt')}>
        change template
      </button>
    );
  },
}));

vi.mock('canvas/components/template-screen/overview-tabs', () => ({
  OverviewTabs: () => <div data-testid="overview" />,
}));

vi.mock('canvas/components/template-screen/properties-inspector', () => ({
  PropertiesInspector: ({ onReset }: { onReset?: () => void }) => (
    <button data-testid="reset-properties" onClick={() => onReset?.()}>
      reset
    </button>
  ),
}));

import { PraxisCanvasSurface } from '../../src/canvas/app';

describe('PraxisCanvasSurface interactions', () => {
  beforeEach(() => {
    undo.mockClear();
    redo.mockClear();
    selectCommit.mockClear();
    resetProperties.mockClear();
    templateSpy.mockClear();
    templateError.mockReturnValue(false);
    projectError.mockReturnValue(false);
  });

  it('falls back to built-in templates when host load fails', async () => {
    templateError.mockReturnValueOnce(true);
    render(<PraxisCanvasSurface />);

    await waitFor(() => {
      expect(templateSpy).toHaveBeenCalled();
    });
    const latestTemplates =
      (templateSpy.mock.calls.at(-1)?.[0] as { id: string; name: string }[] | undefined) ?? [];
    expect(latestTemplates[0]?.name).toBe('Fallback');
  });

  it('surfaces project load errors and allows retry', async () => {
    projectError.mockReturnValueOnce(true);
    render(<PraxisCanvasSurface />);

    await screen.findByText(/projects-failed/);
    fireEvent.click(screen.getAllByTestId('retry-projects')[0]);
    await waitFor(() => {
      expect(screen.queryByText(/projects-failed/)).not.toBeInTheDocument();
    });
  });

  it('handles keyboard shortcuts for undo/redo and commit navigation', async () => {
    render(<PraxisCanvasSurface />);
    await waitFor(() => {
      expect(screen.getAllByTestId('project-count').length).toBeGreaterThan(0);
    });

    fireEvent.keyDown(globalThis, { key: 'z', metaKey: true });
    fireEvent.keyDown(globalThis, { key: 'z', ctrlKey: true, shiftKey: true });
    fireEvent.keyDown(globalThis, { key: 'ArrowRight' });

    expect(undo).toHaveBeenCalled();
    expect(redo).toHaveBeenCalled();
    expect(selectCommit).toHaveBeenCalledWith('c2');
  });

  it('resets properties via inspector action', async () => {
    render(<PraxisCanvasSurface />);
    await waitFor(() => {
      expect(screen.getAllByTestId('project-count').length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getAllByTestId('reset-properties')[0]);
    expect(resetProperties).toHaveBeenCalledWith('n1');
  });
});
