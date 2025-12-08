import { useCallback, useEffect, useMemo, useState } from 'react';

import { OverviewTabs } from 'canvas/components/template-screen/overview-tabs';
import { PraxisShellLayout } from 'canvas/components/template-screen/praxis-shell-layout';
import { ProjectsSidebar } from 'canvas/components/template-screen/projects-sidebar';
import {
  PropertiesInspector,
  type SelectionKind,
} from 'canvas/components/template-screen/properties-inspector';
import { ScenarioSearchBar } from 'canvas/components/template-screen/scenario-search-bar';
import { TemplateHeader } from 'canvas/components/template-screen/template-header';
import { templateScreenCopy } from 'canvas/copy/template-screen';
import { toErrorMessage } from 'canvas/lib/errors';
import { isTauri } from 'canvas/platform';
import { listScenarios, type ScenarioSummary } from 'canvas/praxis-api';
import {
  BUILT_IN_TEMPLATES,
  captureTemplateFromWidgets,
  instantiateTemplate,
  type CanvasTemplate,
} from 'canvas/templates';
import type { CanvasWidget, SelectionState } from 'canvas/types';
import { EMPTY_SELECTION } from 'canvas/types';
import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarTrigger } from 'design-system';
import { useTemporalPanel } from './time/use-temporal-panel';

interface ScenarioState {
  loading: boolean;
  error?: string;
  data: ScenarioSummary[];
}

/**
 * Entry point for the Praxis canvas renderer.
 * @returns {import('react').ReactElement} Canvas route content.
 */
export default function App() {
  return <PraxisCanvasSurface />;
}

/**
 * Exposes the canvas surface for embedding; forwards selection changes.
 * @param {{onSelectionChange?: (selection: SelectionState) => void}} props optional selection change handler
 * @returns {import('react').ReactElement} Canvas surface element
 */
export function PraxisCanvasSurface({
  onSelectionChange,
}: {
  readonly onSelectionChange?: (selection: SelectionState) => void;
} = {}) {
  const experience = usePraxisCanvasState();

  useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(experience.selection);
    }
  }, [experience.selection, onSelectionChange]);

  return <PraxisCanvasSurfaceView {...experience} />;
}

type PraxisCanvasExperience = ReturnType<typeof usePraxisCanvasState>;

/**
 * Central hook assembling state for the canvas experience.
 * @returns {PraxisCanvasExperience} state and handlers used by the canvas UI
 */
function usePraxisCanvasState() {
  const [scenarioState, setScenarioState] = useState<ScenarioState>({ loading: true, data: [] });
  const [selection, setSelection] = useState<SelectionState>(EMPTY_SELECTION);
  const [templates, setTemplates] = useState<CanvasTemplate[]>(BUILT_IN_TEMPLATES);
  const [activeTemplateId, setActiveTemplateId] = useState<string>(BUILT_IN_TEMPLATES[0]?.id ?? '');
  const [activeScenarioId, setActiveScenarioId] = useState<string | undefined>();

  const activeScenario = useMemo(() => {
    const preferred =
      scenarioState.data.find((scenario) => scenario.id === activeScenarioId) ??
      scenarioState.data.find((scenario) => scenario.isDefault);
    return preferred ?? scenarioState.data[0];
  }, [activeScenarioId, scenarioState.data]);

  const activeTemplate = useMemo(() => {
    return templates.find((entry) => entry.id === activeTemplateId) ?? templates[0];
  }, [activeTemplateId, templates]);

  const widgets = useMemo<CanvasWidget[]>(() => {
    if (!activeTemplate) {
      return [];
    }
    return instantiateTemplate(activeTemplate, { scenario: activeScenario?.branch });
  }, [activeScenario?.branch, activeTemplate]);

  const handleSelectionChange = (next: SelectionState) => {
    setSelection(next);
  };

  const handleTemplateChange = (templateId: string) => {
    setActiveTemplateId(templateId);
    setSelection(EMPTY_SELECTION);
  };

  const handleTemplateSave = () => {
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
  };

  const handleScenarioSelect = (scenarioId: string) => {
    setActiveScenarioId(scenarioId);
    setSelection(EMPTY_SELECTION);
  };

  const refreshScenarios = useCallback(async () => {
    setScenarioState((previous) => ({ ...previous, loading: true, error: undefined }));
    try {
      const scenarios = await listScenarios();
      setScenarioState({ loading: false, data: scenarios });
      if (!activeScenarioId) {
        const defaultScenario = scenarios.find((scenario) => scenario.isDefault) ?? scenarios[0];
        setActiveScenarioId(defaultScenario?.id);
      }
    } catch (unknownError) {
      const message = toErrorMessage(unknownError);
      setScenarioState({ loading: false, data: [], error: message });
    }
  }, [activeScenarioId]);

  useEffect(() => {
    void (async () => {
      await refreshScenarios();
    })();
  }, [refreshScenarios]);

  return {
    scenarioState,
    selection,
    templates,
    activeTemplateId,
    activeTemplate,
    activeScenario,
    widgets,
    handleSelectionChange,
    handleTemplateChange,
    handleTemplateSave,
    handleScenarioSelect,
  };
}

/**
 * Renders the main canvas layout with timeline widgets and sidebars.
 * @param {PraxisCanvasExperience} props experience state + handlers
 * @returns {import('react').ReactElement} layout for the canvas surface
 */
function PraxisCanvasSurfaceView({
  scenarioState,
  selection,
  templates,
  activeTemplate,
  activeScenario,
  widgets,
  handleSelectionChange,
  handleTemplateChange,
  handleTemplateSave,
  handleScenarioSelect,
}: Readonly<PraxisCanvasExperience>) {
  const [temporalState, temporalActions] = useTemporalPanel();

  const selectionKind = resolveSelectionKind(selection);
  const selectionId = resolveSelectionId(selection);

  return (
    <PraxisShellLayout
      toolbar={<PraxisToolbar />}
      navigation={
        <ProjectsSidebar
          scenarios={scenarioState.data}
          loading={scenarioState.loading}
          error={scenarioState.error}
          activeScenarioId={activeScenario?.id}
          onSelectScenario={handleScenarioSelect}
        />
      }
      content={
        <div className="space-y-6">
          <TemplateHeader
            scenarioName={activeScenario?.name}
            templateName={activeTemplate?.name}
            templateDescription={activeTemplate?.description}
            templates={templates}
            activeTemplateId={activeTemplate?.id ?? ''}
            onTemplateChange={handleTemplateChange}
            onTemplateSave={handleTemplateSave}
            onCreateWidget={() => {
              console.info('[canvas] create widget placeholder');
            }}
          />
          <ScenarioSearchBar />
          {scenarioState.error && <p className="text-sm text-destructive">{scenarioState.error}</p>}
          <OverviewTabs
            state={temporalState}
            actions={temporalActions}
            widgets={widgets}
            selection={selection}
            onSelectionChange={handleSelectionChange}
            onRequestMetaModelFocus={(types) => {
              if (types.length === 0) {
                return;
              }
              // Placeholder hook into meta-model focus while integrating new shell.
            }}
          />
        </div>
      }
      inspector={<PropertiesInspector selectionKind={selectionKind} selectionId={selectionId} />}
    />
  );
}

/**
 *
 * @param selection
 */
function resolveSelectionKind(selection: SelectionState): SelectionKind {
  if (selection.nodeIds.length > 0) {
    return 'node';
  }
  if (selection.edgeIds.length > 0) {
    return 'edge';
  }
  if (selection.sourceWidgetId) {
    return 'widget';
  }
  return 'none';
}

/**
 *
 * @param selection
 */
function resolveSelectionId(selection: SelectionState): string | undefined {
  if (selection.nodeIds[0]) {
    return selection.nodeIds[0];
  }
  if (selection.edgeIds[0]) {
    return selection.edgeIds[0];
  }
  return selection.sourceWidgetId;
}

/**
 * Simple menubar used as the toolbar slot for the Praxis shell layout.
 */
function PraxisToolbar() {
  const isDesktop = isTauri();
  const copy = templateScreenCopy;

  return (
    <Menubar>
      <MenubarMenu>
        <MenubarTrigger>{copy.templateLabel}</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>Praxis Canvas</MenubarItem>
          <MenubarItem disabled>Tasks</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger>Mode</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>{isDesktop ? 'Desktop' : 'Browser preview'}</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  );
}
