import { useTranslations } from 'next-intl';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type RefCallback,
  type SetStateAction,
} from 'react';

import { dedupeIds } from 'aideon/canvas/selection';
import {
  listLayoutsFromHost,
  listProjectsWithScenarios,
  saveLayoutToHost,
  type ProjectSummary,
} from 'praxis/domain-data';
import { useCommandStack } from 'praxis/hooks/use-command-stack';
import { captureLayoutFromWidgets, instantiateLayout, type LayoutPreset } from 'praxis/layouts';
import { track } from 'praxis/lib/analytics';
import { toErrorMessage } from 'praxis/lib/errors';
import { type GraphViewModel } from 'praxis/praxis-api';
import type {
  PraxisCanvasWidget as CanvasWidget,
  PraxisWidgetViewEvent,
  SelectionKind,
  SelectionState,
  PraxisWidgetKind as WidgetKind,
} from 'praxis/types';
import { listWidgetRegistry } from 'praxis/widgets/registry';

import { applyInspectorPatch } from 'praxis/inspector-patch';
import { createLayoutWidget, upsertLayout } from 'praxis/layout-helpers';
import {
  mergeSelectionProperties,
  resolveViewSelectionProperties,
} from 'praxis/selection-properties';
import {
  SelectionProvider,
  deriveSelectionKind,
  primarySelectionId,
  useSelectionStore,
  type SelectionProperties,
} from 'praxis/stores/selection-store';
import { useTemporalPanel } from 'praxis/time/use-temporal-panel';
import { useCanvasLayout } from 'praxis/use-canvas-layout';
import { usePlatformShortcuts } from 'praxis/use-platform-shortcuts';
import {
  HostPlatformContext,
  type HostPlatformContextValue,
  type ScenarioState,
} from './host-platform-context';

type CommandStack = ReturnType<typeof useCommandStack>;
type CommandStackTranslate = ReturnType<typeof useTranslations<'platform.commandStack'>>;
type SelectionStore = ReturnType<typeof useSelectionStore>;
type TemporalState = ReturnType<typeof useTemporalPanel>[0];
type TemporalActions = ReturnType<typeof useTemporalPanel>[1];
type CanvasLayout = ReturnType<typeof useCanvasLayout>;
type TemplatesData = ReturnType<typeof useTemplatesData>;
type ProjectsData = ReturnType<typeof useProjectsData>;
type Scenario = ScenarioState['data'][number];

type ProjectDataState = HostPlatformContextValue['projectState'];
type TemplatesDataState = HostPlatformContextValue['templatesState'];
type PropertyEditState = HostPlatformContextValue['propertyState'];

interface HostPlatformProviderProperties {
  readonly onSelectionChange?: (selection: SelectionState) => void;
  readonly children: ReactNode;
}

interface RuntimeCursor {
  readonly runtimeScenario: string | undefined;
  readonly runtimeAsOf: string | undefined;
  readonly runtimeLayer: TemporalState['layer'];
}

interface InspectorSaveContext {
  readonly kind: SelectionKind;
  readonly id: string;
  readonly patch: Record<string, string | undefined>;
  readonly selectedProperties: SelectionProperties | undefined;
  readonly branch: string | undefined;
  readonly temporalActions: TemporalActions;
  readonly rejectionFallback: string;
}

interface PlatformHandlers {
  readonly handleSelectionChange: (next: SelectionState) => void;
  readonly handleTemplateChange: (templateId: string) => void;
  readonly handleTemplateSave: () => void;
  readonly handleWidgetCreate: (type: WidgetKind) => void;
  readonly handleScenarioSelect: (scenarioId: string) => void;
  readonly handleRetryProjects: () => void;
  readonly handleInspectorSave: (patch: Record<string, string | undefined>) => void;
  readonly handleInspectorReset: () => void;
  readonly handleGraphViewChange: (event: PraxisWidgetViewEvent) => void;
}

interface SelectionActionsParameters {
  readonly selection: SelectionState;
  readonly setSelection: SelectionStore['setSelection'];
  readonly commandStack: CommandStack;
  readonly translate: CommandStackTranslate;
}

interface TemplateActionsParameters {
  readonly activeScenario: Scenario | undefined;
  readonly activeTemplate: LayoutPreset | undefined;
  readonly activeTemplateId: string;
  readonly clear: SelectionStore['clear'];
  readonly commandStack: CommandStack;
  readonly translate: CommandStackTranslate;
  readonly setTemplatesState: Dispatch<SetStateAction<TemplatesDataState>>;
  readonly setActiveTemplateId: Dispatch<SetStateAction<string>>;
  readonly widgets: CanvasWidget[];
  readonly templatesLength: number;
  readonly setFromWidget: SelectionStore['setFromWidget'];
  readonly setWidgetLibraryOpen: Dispatch<SetStateAction<boolean>>;
}

interface ScenarioActionsParameters {
  readonly activeScenarioId: string | undefined;
  readonly setActiveScenarioId: Dispatch<SetStateAction<string | undefined>>;
  readonly clear: SelectionStore['clear'];
  readonly commandStack: CommandStack;
  readonly translate: CommandStackTranslate;
  readonly refreshProjects: () => Promise<void>;
}

interface InspectorActionsParameters {
  readonly runtimeScenario: string | undefined;
  readonly selectionId: string | undefined;
  readonly selectionKind: SelectionKind;
  readonly selectedProperties: SelectionProperties | undefined;
  readonly translate: CommandStackTranslate;
  readonly temporalActions: TemporalActions;
  readonly temporalState: TemporalState;
  readonly updateProperties: SelectionStore['updateProperties'];
  readonly resetProperties: SelectionStore['resetProperties'];
}

interface PlatformHandlersParameters {
  readonly translate: CommandStackTranslate;
  readonly selectionStore: SelectionStore;
  readonly templates: TemplatesData;
  readonly projects: ProjectsData;
  readonly graphViewChange: (event: PraxisWidgetViewEvent) => void;
  readonly commandStack: CommandStack;
  readonly temporalState: TemporalState;
  readonly temporalActions: TemporalActions;
  readonly widgets: CanvasWidget[];
  readonly runtimeScenario: string | undefined;
  readonly selectionKind: SelectionKind;
  readonly selectionId: string | undefined;
  readonly selectedProperties: SelectionProperties | undefined;
  readonly setWidgetLibraryOpen: Dispatch<SetStateAction<boolean>>;
}

interface HostPlatformContextValueSources {
  readonly templates: TemplatesData;
  readonly projects: ProjectsData;
  readonly selectionStore: SelectionStore;
  readonly widgets: CanvasWidget[];
  readonly selectedProperties: SelectionProperties | undefined;
  readonly selectionKind: SelectionKind;
  readonly selectionId: string | undefined;
  readonly propertyState: PropertyEditState;
  readonly temporalState: TemporalState;
  readonly temporalActions: TemporalActions;
  readonly canvasLayout: CanvasLayout;
  readonly branchSelectReferenceCallback: RefCallback<HTMLButtonElement>;
  readonly handlers: PlatformHandlers;
  readonly debugVisible: boolean;
  readonly widgetLibraryOpen: boolean;
  readonly setWidgetLibraryOpen: Dispatch<SetStateAction<boolean>>;
}

/**
 * Resolve the effective inspector properties for the current selection by
 * merging stored edits over the properties derived from the source graph view.
 * @param selectionState - Current selection and stored per-selection edits.
 * @param selectionState.selection - The active selection state.
 * @param selectionState.properties - Stored per-selection property edits keyed by selection.
 * @param selectionKind - Kind of the current selection.
 * @param selectionId - Primary selection identifier, if any.
 * @param graphViewCache - Cached graph views keyed by source widget id.
 * @returns Merged selection properties, or undefined when nothing is selected.
 */
function resolveSelectedProperties(
  selectionState: {
    readonly selection: SelectionState;
    readonly properties: Record<string, SelectionProperties>;
  },
  selectionKind: SelectionKind,
  selectionId: string | undefined,
  graphViewCache: Map<string, GraphViewModel>,
): SelectionProperties | undefined {
  if (!selectionId) {
    return undefined;
  }
  const storedProperties = Reflect.get(selectionState.properties, selectionId) as
    SelectionProperties | undefined;
  const view = selectionState.selection.sourceWidgetId
    ? graphViewCache.get(selectionState.selection.sourceWidgetId)
    : undefined;
  const viewProperties = resolveViewSelectionProperties({ selectionKind, selectionId, view });
  return mergeSelectionProperties(viewProperties, storedProperties);
}

/**
 * Build the redo/undo pair that records a single-setter state change onto the
 * command stack, capturing the previous and next values.
 * @param setValue - State setter to invoke for redo and undo.
 * @param previous - Value to restore on undo.
 * @param next - Value to apply on redo.
 * @returns Redo and undo callbacks for the command stack entry.
 */
function makeUndoableSetter<Value>(
  setValue: (value: Value) => void,
  previous: Value,
  next: Value,
): { redo: () => void; undo: () => void } {
  return {
    redo: () => {
      setValue(next);
    },
    undo: () => {
      setValue(previous);
    },
  };
}

/**
 * Normalise an incoming selection so that node, edge, and cell ids are deduped.
 * @param next - Raw selection reported by a widget.
 * @returns Selection with deduplicated id collections.
 */
function normaliseSelection(next: SelectionState): SelectionState {
  return {
    sourceWidgetId: next.sourceWidgetId,
    nodeIds: dedupeIds(next.nodeIds),
    edgeIds: dedupeIds(next.edgeIds),
    cellIds: dedupeIds(next.cellIds),
  };
}

/**
 * Flatten the scenarios owned by every project into a single collection.
 * @param projects - Projects loaded from the host.
 * @returns All scenarios across the supplied projects.
 */
function collectScenarios(projects: ProjectSummary[]): ScenarioState['data'] {
  return projects.flatMap((project) => project.scenarios);
}

/**
 * Pick the id of the scenario to activate by default, preferring the flagged
 * default and falling back to the first available scenario.
 * @param scenarios - Available scenarios.
 * @returns Default scenario id, or undefined when there are no scenarios.
 */
function pickDefaultScenarioId(scenarios: ScenarioState['data']): string | undefined {
  const preferred = scenarios.find((scenario) => scenario.isDefault) ?? scenarios[0];
  return preferred?.id;
}

/**
 * Resolve the active scenario for the current selection id, falling back to the
 * default scenario and then to the first available scenario.
 * @param scenarios - Available scenarios.
 * @param activeScenarioId - Currently selected scenario id, if any.
 * @returns The scenario to treat as active, or undefined when none exist.
 */
function resolveActiveScenario(
  scenarios: ScenarioState['data'],
  activeScenarioId: string | undefined,
): Scenario | undefined {
  const preferred =
    scenarios.find((scenario) => scenario.id === activeScenarioId) ??
    scenarios.find((scenario) => scenario.isDefault);
  return preferred ?? scenarios[0];
}

/**
 * Resolve the active template for the current selection id, falling back to the
 * first available template.
 * @param templates - Available templates.
 * @param activeTemplateId - Currently selected template id.
 * @returns The template to treat as active, or undefined when none exist.
 */
function resolveActiveTemplate(
  templates: LayoutPreset[],
  activeTemplateId: string,
): LayoutPreset | undefined {
  return templates.find((entry) => entry.id === activeTemplateId) ?? templates[0];
}

/**
 * Look up the widget registry entry for a widget kind.
 * @param type - Widget kind to look up.
 * @returns The matching registry entry, or undefined when unregistered.
 */
function findWidgetEntry(type: WidgetKind) {
  return listWidgetRegistry().find((item) => item.type === type);
}

/**
 * Replace a single template within a list, matched by id.
 * @param templates - Existing templates.
 * @param id - Id of the template to replace.
 * @param replacement - Template to substitute in place of the match.
 * @returns A new list with the matching template replaced.
 */
function replaceTemplate(
  templates: LayoutPreset[],
  id: string,
  replacement: LayoutPreset,
): LayoutPreset[] {
  return templates.map((template) => (template.id === id ? replacement : template));
}

/**
 * Derive the runtime time cursor (scenario, as-of, layer) from the temporal
 * panel state and the active scenario.
 * @param temporalState - Current temporal panel state.
 * @param activeScenario - Active scenario, if any.
 * @returns The resolved runtime cursor.
 */
function deriveRuntimeCursor(
  temporalState: TemporalState,
  activeScenario: Scenario | undefined,
): RuntimeCursor {
  const runtimeScenario = temporalState.branch ?? activeScenario?.branch;
  const runtimeAsOf = temporalState.commitId ?? runtimeScenario;
  return { runtimeScenario, runtimeAsOf, runtimeLayer: temporalState.layer };
}

/**
 * Instantiate the widgets for the active template at the runtime cursor.
 * @param activeTemplate - Active template, if any.
 * @param cursor - Runtime cursor describing scenario, as-of, and layer.
 * @returns The instantiated canvas widgets, or an empty list when unavailable.
 */
function instantiateWidgets(
  activeTemplate: LayoutPreset | undefined,
  cursor: RuntimeCursor,
): CanvasWidget[] {
  if (!activeTemplate || !cursor.runtimeAsOf) {
    return [];
  }
  return instantiateLayout(activeTemplate, {
    scenario: cursor.runtimeScenario,
    asOf: cursor.runtimeAsOf,
    layer: cursor.runtimeLayer,
  });
}

/**
 * Apply an inspector patch to the host and advance the temporal cursor when the
 * patch produces a new commit.
 * @param context - Patch context, target selection, and temporal actions.
 * @returns Whether the patch was accepted and committed.
 */
async function performInspectorSave(
  context: InspectorSaveContext,
): Promise<{ committed: boolean }> {
  const { kind, id, patch, selectedProperties, branch, temporalActions, rejectionFallback } =
    context;
  const result = await applyInspectorPatch({ kind, id, patch, selectedProperties, branch });
  if (!result) {
    return { committed: false };
  }
  if (!result.accepted) {
    throw new Error(result.message ?? rejectionFallback);
  }
  if (result.commitId) {
    if (branch) {
      await temporalActions.selectBranch(branch);
    }
    temporalActions.selectCommit(result.commitId);
  }
  return { committed: true };
}

/**
 * Owns the layout template collection: loading, active selection, and the
 * derived active template.
 */
function useTemplatesData() {
  const [templatesState, setTemplatesState] = useState<TemplatesDataState>({
    loading: true,
    data: [],
  });
  const [activeTemplateId, setActiveTemplateId] = useState<string>('');

  const refreshTemplates = useCallback(async () => {
    setTemplatesState((previous) => ({ ...previous, loading: true, error: undefined }));
    try {
      const templates = await listLayoutsFromHost();
      setTemplatesState({ loading: false, data: templates });
      setActiveTemplateId((previous) => previous || (templates[0]?.id ?? ''));
    } catch (unknownError) {
      setTemplatesState({
        loading: false,
        data: [],
        error: toErrorMessage(unknownError),
      });
    }
  }, []);

  const activeTemplate = useMemo(
    () => resolveActiveTemplate(templatesState.data, activeTemplateId),
    [activeTemplateId, templatesState.data],
  );

  return {
    templatesState,
    setTemplatesState,
    activeTemplateId,
    setActiveTemplateId,
    activeTemplate,
    refreshTemplates,
  };
}

/**
 * Owns the project and scenario collections: loading, active scenario
 * selection, and the derived active scenario.
 */
function useProjectsData() {
  const [projectState, setProjectState] = useState<ProjectDataState>({
    loading: true,
    data: [],
  });
  const [scenarioState, setScenarioState] = useState<ScenarioState>({ loading: true, data: [] });
  const [activeScenarioId, setActiveScenarioId] = useState<string | undefined>();

  const refreshProjects = useCallback(async () => {
    setProjectState((previous) => ({ ...previous, loading: true, error: undefined }));
    try {
      const projects = await listProjectsWithScenarios();
      const scenarios = collectScenarios(projects);
      setProjectState({ loading: false, data: projects });
      setScenarioState({ loading: false, data: scenarios });
      setActiveScenarioId((previous) => {
        if (previous) {
          return previous;
        }
        return pickDefaultScenarioId(scenarios);
      });
    } catch (unknownError) {
      const message = toErrorMessage(unknownError);
      setProjectState({ loading: false, data: [], error: message });
      setScenarioState({ loading: false, data: [], error: message });
    }
  }, []);

  const activeScenario = useMemo(
    () => resolveActiveScenario(scenarioState.data, activeScenarioId),
    [activeScenarioId, scenarioState.data],
  );

  return {
    projectState,
    scenarioState,
    activeScenarioId,
    setActiveScenarioId,
    activeScenario,
    refreshProjects,
  };
}

/**
 * Owns the per-widget graph view cache used to derive selection properties.
 */
function useGraphViewCache() {
  const [graphViewCache, setGraphViewCache] = useState<Map<string, GraphViewModel>>(
    () => new Map(),
  );
  const handleGraphViewChange = useCallback((event: PraxisWidgetViewEvent) => {
    setGraphViewCache((previous) => {
      const next = new Map(previous);
      next.set(event.widgetId, event.view);
      return next;
    });
  }, []);
  return { graphViewCache, handleGraphViewChange };
}

/**
 * Owns the ref to the branch-select control and its callback ref.
 */
function useBranchSelectReference() {
  const branchSelectReference = useRef<HTMLButtonElement | undefined>(undefined);
  const branchSelectReferenceCallback: RefCallback<HTMLButtonElement> = useCallback((node) => {
    branchSelectReference.current = node ?? undefined;
  }, []);
  return { branchSelectReference, branchSelectReferenceCallback };
}

/**
 * Owns the debug-overlay visibility flag and its toggle.
 */
function useDebugToggle() {
  const [debugVisible, setDebugVisible] = useState(false);
  const toggleDebug = useCallback(() => {
    setDebugVisible((previous) => !previous);
  }, []);
  return { debugVisible, toggleDebug };
}

/**
 * Forward the global selection to the optional consumer callback.
 * @param onSelectionChange - Consumer callback invoked when selection changes.
 * @param selection - Current selection state.
 */
function useForwardSelectionChange(
  onSelectionChange: ((selection: SelectionState) => void) | undefined,
  selection: SelectionState,
): void {
  useEffect(() => {
    onSelectionChange?.(selection);
  }, [onSelectionChange, selection]);
}

/**
 * Emit a time-cursor analytics event whenever the temporal cursor moves.
 * @param temporalState - Current temporal panel state.
 */
function useTrackTemporalCursor(temporalState: TemporalState): void {
  useEffect(() => {
    if (temporalState.branch || temporalState.commitId) {
      track('time.cursor', { branch: temporalState.branch, commitId: temporalState.commitId });
    }
  }, [temporalState.branch, temporalState.commitId]);
}

/**
 * Trigger the initial template and project loads once on mount.
 * @param refreshProjects - Project refresh action.
 * @param refreshTemplates - Template refresh action.
 */
function useInitialWorkspaceLoad(
  refreshProjects: () => Promise<void>,
  refreshTemplates: () => Promise<void>,
): void {
  useEffect(() => {
    refreshTemplates().catch((_ignoredError: unknown) => {
      return;
    });
    refreshProjects().catch((_ignoredError: unknown) => {
      return;
    });
  }, [refreshProjects, refreshTemplates]);
}

/**
 * Follow the active scenario by moving the temporal branch to match it.
 * @param projects - Project and scenario data.
 * @param temporalState - Current temporal panel state.
 * @param temporalActions - Temporal panel actions.
 */
function useAlignTemporalToScenario(
  projects: ProjectsData,
  temporalState: TemporalState,
  temporalActions: TemporalActions,
): void {
  const { activeScenario, scenarioState } = projects;
  useEffect(() => {
    const scenarioBranch = activeScenario?.branch;
    if (!scenarioBranch) {
      return;
    }
    if (scenarioState.loading || temporalState.loading) {
      return;
    }
    if (temporalState.branch === scenarioBranch) {
      return;
    }
    temporalActions.selectBranch(scenarioBranch).catch(() => false);
  }, [
    activeScenario?.branch,
    scenarioState.loading,
    temporalActions,
    temporalState.branch,
    temporalState.loading,
  ]);
}

/**
 * Follow the temporal branch by activating the scenario that matches it.
 * @param projects - Project and scenario data.
 * @param temporalState - Current temporal panel state.
 */
function useAlignScenarioToTemporal(projects: ProjectsData, temporalState: TemporalState): void {
  const { scenarioState, activeScenarioId, setActiveScenarioId } = projects;
  useEffect(() => {
    const branch = temporalState.branch;
    if (!branch) {
      return;
    }
    if (scenarioState.loading) {
      return;
    }
    const match = scenarioState.data.find((scenario) => scenario.branch === branch);
    if (!match) {
      return;
    }
    if (match.id === activeScenarioId) {
      return;
    }
    setActiveScenarioId(match.id);
  }, [
    activeScenarioId,
    scenarioState.data,
    scenarioState.loading,
    setActiveScenarioId,
    temporalState.branch,
  ]);
}

/**
 * Build the selection-change handler: normalise, record on the command stack,
 * and emit analytics.
 * @param parameters - Current selection, setter, command stack, and translator.
 * @returns The selection-change handler.
 */
function useSelectionActions(
  parameters: SelectionActionsParameters,
): (next: SelectionState) => void {
  const { selection, setSelection, commandStack, translate } = parameters;
  return useCallback(
    (next: SelectionState) => {
      const previous = selection;
      const normalised = normaliseSelection(next);
      setSelection(normalised);
      commandStack.record({
        label: translate('selectionChange'),
        ...makeUndoableSetter<SelectionState>(setSelection, previous, normalised),
      });
      track('selection.change', {
        kind: deriveSelectionKind(normalised),
        sourceWidgetId: normalised.sourceWidgetId,
        nodeCount: normalised.nodeIds.length,
        edgeCount: normalised.edgeIds.length,
      });
    },
    [commandStack, selection, setSelection, translate],
  );
}

/**
 * Build the template action handlers: change, save, and widget creation.
 * @param parameters - Template/scenario state, setters, and dependencies.
 * @returns The template action handlers.
 */
function useTemplateActions(parameters: TemplateActionsParameters) {
  const {
    activeScenario,
    activeTemplate,
    activeTemplateId,
    clear,
    commandStack,
    translate,
    setTemplatesState,
    setActiveTemplateId,
    widgets,
    templatesLength,
    setFromWidget,
    setWidgetLibraryOpen,
  } = parameters;

  const handleTemplateChange = useCallback(
    (templateId: string) => {
      const previous = activeTemplateId;
      setActiveTemplateId(templateId);
      clear();
      commandStack.record({
        label: translate('templateChange'),
        ...makeUndoableSetter<string>(setActiveTemplateId, previous, templateId),
      });
      track('template.change', { templateId, scenarioId: activeScenario?.id });
    },
    [activeScenario?.id, activeTemplateId, clear, commandStack, setActiveTemplateId, translate],
  );

  const commitTemplate = useCallback(
    (template: LayoutPreset) => {
      setTemplatesState((previous) => ({
        ...previous,
        data: upsertLayout(previous.data, template),
      }));
      setActiveTemplateId(template.id);
      track('template.change', { templateId: template.id, scenarioId: activeScenario?.id });
    },
    [activeScenario?.id, setActiveTemplateId, setTemplatesState],
  );

  const handleTemplateSave = useCallback(() => {
    if (widgets.length === 0) {
      return;
    }
    const nextIndexLabel = (templatesLength + 1).toString();
    const name = translate('templateName', { number: nextIndexLabel });
    const snapshot = captureLayoutFromWidgets(name, translate('savedFromRuntime'), widgets);
    const saveTemplate = async () => {
      const saved = await saveLayoutToHost(snapshot);
      commitTemplate(saved);
    };
    void saveTemplate();
  }, [commitTemplate, translate, templatesLength, widgets]);

  const handleWidgetCreate = useCallback(
    (type: WidgetKind) => {
      if (!activeTemplate) {
        return;
      }
      const entry = findWidgetEntry(type);
      if (!entry) {
        return;
      }
      const newWidgetId = `${type}-${Date.now().toString(36)}`;
      const newWidget = createLayoutWidget(entry, newWidgetId);
      const newTemplate: LayoutPreset = {
        ...activeTemplate,
        widgets: [...activeTemplate.widgets, newWidget],
      };
      setTemplatesState((previous) => ({
        ...previous,
        data: replaceTemplate(previous.data, activeTemplate.id, newTemplate),
      }));
      setActiveTemplateId(newTemplate.id);
      setFromWidget({ widgetId: newWidgetId, nodeIds: [], edgeIds: [], cellIds: [] });
      setWidgetLibraryOpen(false);
      track('template.create_widget', { widgetType: type, templateId: newTemplate.id });
    },
    [activeTemplate, setActiveTemplateId, setFromWidget, setTemplatesState, setWidgetLibraryOpen],
  );

  return { handleTemplateChange, handleTemplateSave, handleWidgetCreate };
}

/**
 * Build the scenario action handlers: select and retry project loading.
 * @param parameters - Scenario state, setters, and dependencies.
 * @returns The scenario action handlers.
 */
function useScenarioActions(parameters: ScenarioActionsParameters) {
  const { activeScenarioId, setActiveScenarioId, clear, commandStack, translate, refreshProjects } =
    parameters;

  const handleScenarioSelect = useCallback(
    (scenarioId: string) => {
      const previous = activeScenarioId;
      setActiveScenarioId(scenarioId);
      clear();
      commandStack.record({
        label: translate('scenarioChange'),
        ...makeUndoableSetter<string | undefined>(setActiveScenarioId, previous, scenarioId),
      });
    },
    [activeScenarioId, clear, commandStack, setActiveScenarioId, translate],
  );

  const handleRetryProjects = useCallback(() => {
    refreshProjects().catch((_ignoredError: unknown) => {
      return;
    });
  }, [refreshProjects]);

  return { handleScenarioSelect, handleRetryProjects };
}

/**
 * Build the inspector action handlers and own the inspector save state.
 * @param parameters - Selection, runtime cursor, temporal actions, and setters.
 * @returns The inspector save state and its handlers.
 */
function useInspectorActions(parameters: InspectorActionsParameters) {
  const {
    runtimeScenario,
    selectionId,
    selectionKind,
    selectedProperties,
    translate,
    temporalActions,
    temporalState,
    updateProperties,
    resetProperties,
  } = parameters;

  const [propertyState, setPropertyState] = useState<PropertyEditState>({
    saving: false,
    reloadTick: 0,
  });

  const handleInspectorSave = useCallback(
    (patch: Record<string, string | undefined>) => {
      const id = selectionId;
      if (!id) {
        return;
      }
      const kind: SelectionKind = selectionKind;
      updateProperties(id, {
        name: patch.name,
        dataSource: patch.dataSource,
        layout: patch.layout,
        description: patch.description,
      });
      setPropertyState((previous) => ({ ...previous, saving: true, error: undefined }));
      void (async () => {
        try {
          const branch = runtimeScenario ?? temporalState.branch;
          const { committed } = await performInspectorSave({
            kind,
            id,
            patch,
            selectedProperties,
            branch,
            temporalActions,
            rejectionFallback: translate('operationRejected'),
          });
          if (committed) {
            setPropertyState((previous) => ({ ...previous, reloadTick: previous.reloadTick + 1 }));
            track('inspector.save', { selectionKind: kind, selectionId: id });
          }
        } catch (unknownError) {
          setPropertyState((previous) => ({ ...previous, error: toErrorMessage(unknownError) }));
          track('error.ui', { surface: 'inspector', message: toErrorMessage(unknownError) });
        } finally {
          setPropertyState((previous) => ({ ...previous, saving: false }));
        }
      })();
    },
    [
      runtimeScenario,
      selectionId,
      selectionKind,
      selectedProperties,
      translate,
      temporalActions,
      temporalState.branch,
      updateProperties,
    ],
  );

  const handleInspectorReset = useCallback(() => {
    if (selectionId) {
      resetProperties(selectionId);
    }
  }, [resetProperties, selectionId]);

  return { propertyState, handleInspectorSave, handleInspectorReset };
}

/**
 * Compose every workspace command handler and the inspector save state.
 * @param parameters - Grouped workspace state, stores, and dependencies.
 * @returns The inspector save state and the composed command handlers.
 */
function usePlatformHandlers(parameters: PlatformHandlersParameters): {
  propertyState: PropertyEditState;
  handlers: PlatformHandlers;
} {
  const {
    translate,
    selectionStore,
    templates,
    projects,
    graphViewChange,
    commandStack,
    temporalState,
    temporalActions,
    widgets,
    runtimeScenario,
    selectionKind,
    selectionId,
    selectedProperties,
    setWidgetLibraryOpen,
  } = parameters;

  const handleSelectionChange = useSelectionActions({
    selection: selectionStore.state.selection,
    setSelection: selectionStore.setSelection,
    commandStack,
    translate,
  });

  const templateActions = useTemplateActions({
    activeScenario: projects.activeScenario,
    activeTemplate: templates.activeTemplate,
    activeTemplateId: templates.activeTemplateId,
    clear: selectionStore.clear,
    commandStack,
    translate,
    setTemplatesState: templates.setTemplatesState,
    setActiveTemplateId: templates.setActiveTemplateId,
    widgets,
    templatesLength: templates.templatesState.data.length,
    setFromWidget: selectionStore.setFromWidget,
    setWidgetLibraryOpen,
  });

  const scenarioActions = useScenarioActions({
    activeScenarioId: projects.activeScenarioId,
    setActiveScenarioId: projects.setActiveScenarioId,
    clear: selectionStore.clear,
    commandStack,
    translate,
    refreshProjects: projects.refreshProjects,
  });

  const inspectorActions = useInspectorActions({
    runtimeScenario,
    selectionId,
    selectionKind,
    selectedProperties,
    translate,
    temporalActions,
    temporalState,
    updateProperties: selectionStore.updateProperties,
    resetProperties: selectionStore.resetProperties,
  });

  return {
    propertyState: inspectorActions.propertyState,
    handlers: {
      handleSelectionChange,
      handleTemplateChange: templateActions.handleTemplateChange,
      handleTemplateSave: templateActions.handleTemplateSave,
      handleWidgetCreate: templateActions.handleWidgetCreate,
      handleScenarioSelect: scenarioActions.handleScenarioSelect,
      handleRetryProjects: scenarioActions.handleRetryProjects,
      handleInspectorSave: inspectorActions.handleInspectorSave,
      handleInspectorReset: inspectorActions.handleInspectorReset,
      handleGraphViewChange: graphViewChange,
    },
  };
}

interface HostPlatformContextValueInput {
  readonly projectState: HostPlatformContextValue['projectState'];
  readonly scenarioState: HostPlatformContextValue['scenarioState'];
  readonly templatesState: HostPlatformContextValue['templatesState'];
  readonly activeTemplateId: string;
  readonly activeScenarioId: string | undefined;
  readonly templateName: string | undefined;
  readonly scenarioName: string | undefined;
  readonly widgets: HostPlatformContextValue['widgets'];
  readonly selection: HostPlatformContextValue['selection'];
  readonly selectedProperties: HostPlatformContextValue['selectedProperties'];
  readonly selectionKind: HostPlatformContextValue['selectionKind'];
  readonly selectionId: HostPlatformContextValue['selectionId'];
  readonly propertyState: HostPlatformContextValue['propertyState'];
  readonly temporalState: HostPlatformContextValue['temporalState'];
  readonly temporalActions: HostPlatformContextValue['temporalActions'];
  readonly canvasLayoutKey: HostPlatformContextValue['canvasLayoutKey'];
  readonly canvasLayoutPersistence: HostPlatformContextValue['canvasLayoutPersistence'];
  readonly graphLayoutContext: HostPlatformContextValue['graphLayoutContext'];
  readonly branchSelectReferenceCallback: HostPlatformContextValue['branchSelectReferenceCallback'];
  readonly onTemplateChange: HostPlatformContextValue['onTemplateChange'];
  readonly onTemplateSave: HostPlatformContextValue['onTemplateSave'];
  readonly onSelectScenario: HostPlatformContextValue['onSelectScenario'];
  readonly onRetryProjects: HostPlatformContextValue['onRetryProjects'];
  readonly onSelectionChange: HostPlatformContextValue['onSelectionChange'];
  readonly onInspectorSave: HostPlatformContextValue['onInspectorSave'];
  readonly onInspectorReset: HostPlatformContextValue['onInspectorReset'];
  readonly onGraphViewChange: HostPlatformContextValue['onGraphViewChange'];
  readonly debugVisible: HostPlatformContextValue['debugVisible'];
  readonly widgetLibraryOpen: HostPlatformContextValue['widgetLibraryOpen'];
  readonly setWidgetLibraryOpen: Dispatch<SetStateAction<boolean>>;
  readonly onCreateWidgetType: HostPlatformContextValue['onCreateWidgetType'];
}

/**
 * Assemble the host platform context value from its constituent state and
 * handlers, preserving the exact shape consumed by descendants.
 * @param input - The pre-resolved context fields.
 * @returns The host platform context value.
 */
function buildHostPlatformContextValue(
  input: HostPlatformContextValueInput,
): HostPlatformContextValue {
  const {
    projectState,
    scenarioState,
    templatesState,
    activeTemplateId,
    activeScenarioId,
    templateName,
    scenarioName,
    widgets,
    selection,
    selectedProperties,
    selectionKind,
    selectionId,
    propertyState,
    temporalState,
    temporalActions,
    canvasLayoutKey,
    canvasLayoutPersistence,
    graphLayoutContext,
    branchSelectReferenceCallback,
    onTemplateChange,
    onTemplateSave,
    onSelectScenario,
    onRetryProjects,
    onSelectionChange,
    onInspectorSave,
    onInspectorReset,
    onGraphViewChange,
    debugVisible,
    widgetLibraryOpen,
    setWidgetLibraryOpen,
    onCreateWidgetType,
  } = input;
  return {
    projectState,
    scenarioState,
    templatesState,
    activeTemplateId,
    activeScenarioId,
    templateName,
    scenarioName,
    widgets,
    selection,
    selectedProperties,
    selectionKind,
    selectionId,
    propertyState,
    temporalState,
    temporalActions,
    canvasLayoutKey,
    canvasLayoutPersistence,
    graphLayoutContext,
    branchSelectReferenceCallback,
    onTemplateChange,
    onTemplateSave,
    onCreateWidget: () => {
      setWidgetLibraryOpen(true);
    },
    onSelectScenario,
    onRetryProjects,
    onSelectionChange,
    onInspectorSave,
    onInspectorReset,
    onGraphViewChange,
    debugVisible,
    widgetLibraryOpen,
    onToggleWidgetLibrary: setWidgetLibraryOpen,
    onCreateWidgetType,
  };
}

/**
 * Memoise the host platform context value with the exact dependency set that
 * governs when descendants re-render.
 * @param sources - Grouped workspace state, handlers, and UI flags.
 * @returns The memoised host platform context value.
 */
function useHostPlatformContextValue(
  sources: HostPlatformContextValueSources,
): HostPlatformContextValue {
  const {
    templates: { activeTemplate, templatesState },
    projects: { projectState, scenarioState, activeScenario },
    selectionStore: { state: selectionState },
    canvasLayout: { canvasLayoutKey, canvasLayoutPersistence, graphLayoutContext },
    handlers: {
      handleTemplateChange,
      handleTemplateSave,
      handleScenarioSelect,
      handleRetryProjects,
      handleSelectionChange,
      handleInspectorSave,
      handleInspectorReset,
      handleGraphViewChange,
      handleWidgetCreate,
    },
    widgets,
    selectedProperties,
    selectionKind,
    selectionId,
    propertyState,
    temporalState,
    temporalActions,
    branchSelectReferenceCallback,
    debugVisible,
    widgetLibraryOpen,
    setWidgetLibraryOpen,
  } = sources;

  return useMemo<HostPlatformContextValue>(
    () =>
      buildHostPlatformContextValue({
        projectState,
        scenarioState,
        templatesState,
        activeTemplateId: activeTemplate?.id ?? '',
        activeScenarioId: activeScenario?.id,
        templateName: activeTemplate?.name,
        scenarioName: activeScenario?.name,
        widgets,
        selection: selectionState.selection,
        selectedProperties,
        selectionKind,
        selectionId,
        propertyState,
        temporalState,
        temporalActions,
        canvasLayoutKey,
        canvasLayoutPersistence,
        graphLayoutContext,
        branchSelectReferenceCallback,
        onTemplateChange: handleTemplateChange,
        onTemplateSave: handleTemplateSave,
        onSelectScenario: handleScenarioSelect,
        onRetryProjects: handleRetryProjects,
        onSelectionChange: handleSelectionChange,
        onInspectorSave: handleInspectorSave,
        onInspectorReset: handleInspectorReset,
        onGraphViewChange: handleGraphViewChange,
        debugVisible,
        widgetLibraryOpen,
        setWidgetLibraryOpen,
        onCreateWidgetType: handleWidgetCreate,
      }),
    [
      activeScenario?.id,
      activeScenario?.name,
      activeTemplate?.id,
      activeTemplate?.name,
      branchSelectReferenceCallback,
      debugVisible,
      handleInspectorReset,
      handleInspectorSave,
      handleRetryProjects,
      handleScenarioSelect,
      handleSelectionChange,
      handleTemplateChange,
      handleTemplateSave,
      handleWidgetCreate,
      handleGraphViewChange,
      projectState,
      scenarioState,
      selectionId,
      selectionKind,
      selectionState.selection,
      selectedProperties,
      propertyState,
      templatesState,
      temporalActions,
      temporalState,
      canvasLayoutKey,
      canvasLayoutPersistence,
      graphLayoutContext,
      setWidgetLibraryOpen,
      widgetLibraryOpen,
      widgets,
    ],
  );
}

/**
 * Provide Praxis workspace selection and state context to descendant slots.
 * @param root0 - Provider props.
 * @param root0.onSelectionChange - Forwarded when the global selection changes.
 * @param root0.children - Workspace slot tree.
 */
export function HostPlatformProvider({
  onSelectionChange,
  children,
}: HostPlatformProviderProperties) {
  return (
    <SelectionProvider>
      <HostPlatformStateProvider onSelectionChange={onSelectionChange}>
        {children}
      </HostPlatformStateProvider>
    </SelectionProvider>
  );
}

/**
 * Owns the Praxis workspace state: projects, scenarios, templates, selection,
 * temporal cursor, canvas layout, and inspector edits.
 * @param root0 - Provider props.
 * @param root0.onSelectionChange - Forwarded when the global selection changes.
 * @param root0.children - Workspace slot tree.
 */
function HostPlatformStateProvider({
  onSelectionChange,
  children,
}: {
  readonly onSelectionChange?: (selection: SelectionState) => void;
  readonly children: ReactNode;
}) {
  const t = useTranslations('platform.commandStack');
  const selectionStore = useSelectionStore();
  const templates = useTemplatesData();
  const projects = useProjectsData();
  const [widgetLibraryOpen, setWidgetLibraryOpen] = useState(false);
  const graphCache = useGraphViewCache();
  const branchReference = useBranchSelectReference();
  const commandStack = useCommandStack();
  const [temporalState, temporalActions] = useTemporalPanel();
  const debug = useDebugToggle();

  useForwardSelectionChange(onSelectionChange, selectionStore.state.selection);
  useTrackTemporalCursor(temporalState);
  useInitialWorkspaceLoad(projects.refreshProjects, templates.refreshTemplates);
  useAlignTemporalToScenario(projects, temporalState, temporalActions);
  useAlignScenarioToTemporal(projects, temporalState);

  const { activeTemplate } = templates;
  const { runtimeScenario, runtimeAsOf, runtimeLayer } = deriveRuntimeCursor(
    temporalState,
    projects.activeScenario,
  );

  const widgets = useMemo<CanvasWidget[]>(
    () => instantiateWidgets(activeTemplate, { runtimeScenario, runtimeAsOf, runtimeLayer }),
    [activeTemplate, runtimeAsOf, runtimeLayer, runtimeScenario],
  );

  const canvasLayout = useCanvasLayout({
    documentId: activeTemplate?.documentId,
    asOf: runtimeAsOf,
    scenario: runtimeScenario,
    layer: runtimeLayer,
  });

  const selectionKind = deriveSelectionKind(selectionStore.state.selection);
  const selectionId = primarySelectionId(selectionStore.state.selection);
  const selectedProperties = resolveSelectedProperties(
    selectionStore.state,
    selectionKind,
    selectionId,
    graphCache.graphViewCache,
  );

  const { propertyState, handlers } = usePlatformHandlers({
    translate: t,
    selectionStore,
    templates,
    projects,
    graphViewChange: graphCache.handleGraphViewChange,
    commandStack,
    temporalState,
    temporalActions,
    widgets,
    runtimeScenario,
    selectionKind,
    selectionId,
    selectedProperties,
    setWidgetLibraryOpen,
  });

  usePlatformShortcuts({
    commandStack,
    temporalState,
    temporalActions,
    branchSelectReference: branchReference.branchSelectReference,
    onToggleDebug: debug.toggleDebug,
  });

  const contextValue = useHostPlatformContextValue({
    templates,
    projects,
    selectionStore,
    widgets,
    selectedProperties,
    selectionKind,
    selectionId,
    propertyState,
    temporalState,
    temporalActions,
    canvasLayout,
    branchSelectReferenceCallback: branchReference.branchSelectReferenceCallback,
    handlers,
    debugVisible: debug.debugVisible,
    widgetLibraryOpen,
    setWidgetLibraryOpen,
  });

  return (
    <HostPlatformContext.Provider value={contextValue}>{children}</HostPlatformContext.Provider>
  );
}
