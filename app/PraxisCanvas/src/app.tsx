import { useCallback, useEffect, useMemo, useState } from 'react';

import type { CanvasWidget, SelectionState } from '@/canvas/types';
import { EMPTY_SELECTION } from '@/canvas/types';
import { AppSidebar } from '@/components/app-sidebar';
import { ActivityFeedCard } from '@/components/dashboard/activity-feed-card';
import { CommitTimelineCard } from '@/components/dashboard/commit-timeline-card';
import { GlobalSearchCard } from '@/components/dashboard/global-search-card';
import { MetaModelPanel } from '@/components/dashboard/meta-model-panel';
import { PhaseCheckpointsCard } from '@/components/dashboard/phase-checkpoints-card';
import { SelectionInspectorCard } from '@/components/dashboard/selection-inspector-card';
import { TimeCursorCard } from '@/components/dashboard/time-cursor-card';
import { WorkerHealthCard } from '@/components/dashboard/worker-health-card';
import { SearchBar } from '@/components/shell/search-bar';
import type { WorkspaceTabValue } from '@/components/workspace-tabs';
import { WorkspaceTabs } from '@/components/workspace-tabs';
import { toErrorMessage } from '@/lib/errors';
import { searchStore } from '@/lib/search';
import type { SidebarTreeNode } from '@/lib/search/types';
import { isTauri } from '@/platform';
import { listScenarios, type ScenarioSummary } from '@/praxis-api';
import {
  BUILT_IN_TEMPLATES,
  captureTemplateFromWidgets,
  instantiateTemplate,
  type CanvasTemplate,
} from '@/templates';
import { Button } from '@aideon/design-system/components/ui/button';
import { invoke } from '@tauri-apps/api/core';

interface ScenarioState {
  loading: boolean;
  error?: string;
  data: ScenarioSummary[];
}

const SIDEBAR_ITEMS: SidebarTreeNode[] = [
  {
    id: 'workspace',
    label: 'Workspace',
    children: [
      { id: 'overview', label: 'Overview' },
      { id: 'timeline', label: 'Timeline' },
      { id: 'canvas', label: 'Canvas' },
      { id: 'activity', label: 'Activity' },
    ],
  },
  {
    id: 'catalogues',
    label: 'Catalogues',
    children: [
      { id: 'applications', label: 'Applications' },
      { id: 'data', label: 'Data' },
    ],
  },
  { id: 'metamodel', label: 'Meta-model' },
  { id: 'visualisations', label: 'Visualisations' },
  { id: 'about', label: 'About Praxis' },
  { id: 'settings', label: 'Preferences' },
  { id: 'status', label: 'Status' },
];

export default function App() {
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  const isCanvasRoute = path === '/canvas';

  if (!isCanvasRoute) {
    return <UnsupportedPage path={path} />;
  }

  const [scenarioState, setScenarioState] = useState<ScenarioState>({ loading: true, data: [] });
  const [selection, setSelection] = useState<SelectionState>(EMPTY_SELECTION);
  const [templates, setTemplates] = useState<CanvasTemplate[]>(BUILT_IN_TEMPLATES);
  const [activeTemplateId, setActiveTemplateId] = useState<string>(BUILT_IN_TEMPLATES[0]?.id ?? '');
  const [focusEntryId, setFocusEntryId] = useState<string | undefined>();
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTabValue>('overview');

  const openHostWindow = useCallback(
    async (command: 'open_settings' | 'open_about' | 'open_status' | 'open_styleguide') => {
      if (!isTauri()) {
        return;
      }
      try {
        await invoke(command);
      } catch (error) {
        console.warn(`failed to open ${command}`, error);
      }
    },
    [],
  );

  const handleSidebarSelect = useCallback(
    (id: string) => {
      switch (id) {
        case 'overview':
        case 'timeline':
        case 'canvas':
        case 'activity':
          setWorkspaceTab(id as WorkspaceTabValue);
          break;
        case 'visualisations':
        case 'applications':
        case 'data':
          setWorkspaceTab('canvas');
          break;
        case 'metamodel':
          setFocusEntryId('meta-model');
          break;
        case 'about':
          void openHostWindow('open_about');
          break;
        case 'settings':
          void openHostWindow('open_settings');
          break;
        case 'status':
          void openHostWindow('open_status');
          break;
        default:
          break;
      }
    },
    [openHostWindow],
  );

  const activeScenario = useMemo(
    () => scenarioState.data.find((scenario) => scenario.isDefault) ?? scenarioState.data[0],
    [scenarioState.data],
  );

  const activeTemplate = useMemo(() => {
    return templates.find((entry) => entry.id === activeTemplateId) ?? templates[0];
  }, [activeTemplateId, templates]);

  const widgets = useMemo<CanvasWidget[]>(() => {
    if (!activeTemplate) {
      return [];
    }
    return instantiateTemplate(activeTemplate, { scenario: activeScenario?.branch });
  }, [activeScenario?.branch, activeTemplate]);

  const handleSelectionChange = useCallback((next: SelectionState) => {
    setSelection(next);
  }, []);

  const handleMetaModelFocus = useCallback((types: string[]) => {
    const [primary] = types;
    if (primary) {
      setFocusEntryId(primary);
    }
  }, []);

  const handleCommandPaletteSelection = useCallback((nodeIds: string[]) => {
    setSelection({ sourceWidgetId: 'command-palette', nodeIds, edgeIds: [] });
  }, []);

  const handleTemplateChange = useCallback((templateId: string) => {
    setActiveTemplateId(templateId);
    setSelection(EMPTY_SELECTION);
  }, []);

  const handleSaveTemplate = useCallback(() => {
    if (widgets.length === 0) {
      return;
    }
    const nextIndexLabel = (templates.length + 1).toString();
    const name = globalThis.prompt('Template name', `Template ${nextIndexLabel}`);
    if (!name?.trim()) {
      return;
    }
    const snapshot = captureTemplateFromWidgets(name.trim(), 'Saved from runtime', widgets);
    setTemplates((previous) => [...previous, snapshot]);
    setActiveTemplateId(snapshot.id);
  }, [templates.length, widgets]);

  const refreshScenarios = useCallback(async () => {
    setScenarioState((previous) => ({ ...previous, loading: true, error: undefined }));
    try {
      const scenarios = await listScenarios();
      setScenarioState({ loading: false, data: scenarios });
    } catch (unknownError) {
      const message = toErrorMessage(unknownError);
      setScenarioState({ loading: false, data: [], error: message });
    }
  }, []);

  useEffect(() => {
    void refreshScenarios();
  }, [refreshScenarios]);

  useEffect(() => {
    searchStore.setSidebarItems(SIDEBAR_ITEMS, handleSidebarSelect);
  }, [handleSidebarSelect]);

  return (
    <div className="flex min-h-screen bg-muted/30 text-foreground">
      <AppSidebar scenarios={scenarioState.data} loading={scenarioState.loading} />
      <main className="flex flex-1 flex-col">
        <ShellHeader
          scenarioName={activeScenario?.name}
          templateName={activeTemplate?.name}
          templates={templates}
          activeTemplateId={activeTemplate?.id ?? ''}
          onTemplateChange={handleTemplateChange}
          onTemplateSave={handleSaveTemplate}
        />
        <div className="px-6 pt-3">
          <SearchBar />
        </div>
        {scenarioState.error ? (
          <p className="px-6 pt-2 text-sm text-destructive">{scenarioState.error}</p>
        ) : null}
        <div className="flex flex-1 flex-col gap-6 p-6 lg:flex-row">
          <section className="flex-1">
            <WorkspaceTabs
              widgets={widgets}
              selection={selection}
              onSelectionChange={handleSelectionChange}
              onRequestMetaModelFocus={handleMetaModelFocus}
              value={workspaceTab}
              onValueChange={setWorkspaceTab}
            />
          </section>
          <section className="w-full space-y-6 lg:w-[360px]">
            <TimeCursorCard />
            <CommitTimelineCard />
            <ActivityFeedCard />
            <GlobalSearchCard
              onSelectNodes={handleCommandPaletteSelection}
              onFocusMetaModel={(entry) => {
                setFocusEntryId(entry.id);
              }}
              onShowTimeline={() => {
                setWorkspaceTab('timeline');
              }}
            />
            <MetaModelPanel focusEntryId={focusEntryId} />
            <SelectionInspectorCard
              selection={selection}
              widgets={widgets}
              onSelectionChange={handleSelectionChange}
            />
            <WorkerHealthCard />
            <PhaseCheckpointsCard />
          </section>
        </div>
      </main>
    </div>
  );
}

interface ShellHeaderProperties {
  readonly scenarioName?: string;
  readonly templateName?: string;
  readonly templates: CanvasTemplate[];
  readonly activeTemplateId: string;
  readonly onTemplateChange: (templateId: string) => void;
  readonly onTemplateSave: () => void;
}

function UnsupportedPage({ path }: { readonly path: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 text-foreground">
      <div className="max-w-2xl space-y-6 rounded-3xl border border-border/60 bg-background/90 p-10 text-center shadow-2xl">
        <p className="text-sm uppercase tracking-[0.4em] text-muted-foreground">Unsupported path</p>
        <h1 className="text-3xl font-semibold text-foreground">
          {path === '/' ? 'Launch Praxis Desktop' : 'Route unavailable outside Tauri'}
        </h1>
        <p className="text-sm text-muted-foreground">
          This experience is shipped inside the Aideon Praxis desktop app. Open it to reach the
          canvas at
          <span className="font-mono text-xs text-foreground"> /canvas </span>.
        </p>
        <p className="text-xs font-mono text-muted-foreground">Requested route: {path}</p>
      </div>
    </div>
  );
}

function ShellHeader({
  scenarioName,
  templateName,
  templates,
  activeTemplateId,
  onTemplateChange,
  onTemplateSave,
}: ShellHeaderProperties) {
  return (
    <header className="flex flex-col gap-4 border-b border-border/70 px-6 py-5 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Active template</p>
        <h1 className="text-2xl font-semibold">{templateName ?? 'Untitled canvas'}</h1>
        <p className="text-sm text-muted-foreground">
          {scenarioName ? `Scenario: ${scenarioName}` : 'Scenario data pending'} · Template-driven
          canvases now pair graph, catalogue, matrix, and chart widgets.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Template</span>
          <select
            className="rounded-lg border border-border/60 bg-background px-3 py-2 text-foreground"
            value={activeTemplateId}
            onChange={(event) => {
              onTemplateChange(event.target.value);
            }}
          >
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
        </label>
        <Button variant="secondary" onClick={onTemplateSave}>
          Save template
        </Button>
        <Button>Create widget</Button>
      </div>
    </header>
  );
}
