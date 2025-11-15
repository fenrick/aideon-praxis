import { useCallback, useEffect, useMemo, useState } from 'react';

import type { CanvasWidget, SelectionState } from '@/canvas/types';
import { EMPTY_SELECTION } from '@/canvas/types';
import { AppSidebar } from '@/components/app-sidebar';
import { ActivityFeedCard } from '@/components/dashboard/activity-feed-card';
import { CanvasRuntimeCard } from '@/components/dashboard/canvas-runtime-card';
import { CommitTimelineCard } from '@/components/dashboard/commit-timeline-card';
import { GlobalSearchCard } from '@/components/dashboard/global-search-card';
import { MetaModelPanel } from '@/components/dashboard/meta-model-panel';
import { PhaseCheckpointsCard } from '@/components/dashboard/phase-checkpoints-card';
import { SelectionInspectorCard } from '@/components/dashboard/selection-inspector-card';
import { TimeCursorCard } from '@/components/dashboard/time-cursor-card';
import { WorkerHealthCard } from '@/components/dashboard/worker-health-card';
import { Button } from '@/components/ui/button';
import { toErrorMessage } from '@/lib/errors';
import { listScenarios, type ScenarioSummary } from '@/praxis-api';
import {
  BUILT_IN_TEMPLATES,
  captureTemplateFromWidgets,
  instantiateTemplate,
  type CanvasTemplate,
} from '@/templates';

interface ScenarioState {
  loading: boolean;
  error?: string;
  data: ScenarioSummary[];
}

export default function App() {
  const [scenarioState, setScenarioState] = useState<ScenarioState>({ loading: true, data: [] });
  const [selection, setSelection] = useState<SelectionState>(EMPTY_SELECTION);
  const [templates, setTemplates] = useState<CanvasTemplate[]>(BUILT_IN_TEMPLATES);
  const [activeTemplateId, setActiveTemplateId] = useState<string>(BUILT_IN_TEMPLATES[0]?.id ?? '');
  const [focusEntryId, setFocusEntryId] = useState<string | undefined>();

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
        {scenarioState.error ? (
          <p className="px-6 pt-2 text-sm text-destructive">{scenarioState.error}</p>
        ) : null}
        <div className="flex flex-1 flex-col gap-6 p-6 lg:flex-row">
          <section className="flex-1">
            <CanvasRuntimeCard
              widgets={widgets}
              selection={selection}
              onSelectionChange={handleSelectionChange}
              onRequestMetaModelFocus={(types) => {
                const [primary] = types;
                if (primary) {
                  setFocusEntryId(primary);
                }
              }}
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
