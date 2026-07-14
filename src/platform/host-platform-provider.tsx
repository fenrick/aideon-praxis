import { useTranslations } from 'next-intl';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefCallback,
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

interface HostPlatformProviderProperties {
  readonly onSelectionChange?: (selection: SelectionState) => void;
  readonly children: ReactNode;
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
  const {
    state: selectionState,
    setFromWidget,
    setSelection,
    clear,
    updateProperties,
    resetProperties,
  } = useSelectionStore();
  const [projectState, setProjectState] = useState<{
    loading: boolean;
    data: ProjectSummary[];
    error?: string;
  }>({
    loading: true,
    data: [],
  });
  const [scenarioState, setScenarioState] = useState<ScenarioState>({ loading: true, data: [] });
  const [templatesState, setTemplatesState] = useState<{
    loading: boolean;
    data: LayoutPreset[];
    error?: string;
  }>({
    loading: true,
    data: [],
  });
  const [activeTemplateId, setActiveTemplateId] = useState<string>('');
  const [activeScenarioId, setActiveScenarioId] = useState<string | undefined>();
  const [widgetLibraryOpen, setWidgetLibraryOpen] = useState(false);
  const [propertyState, setPropertyState] = useState<{
    saving: boolean;
    error?: string;
    reloadTick: number;
  }>({
    saving: false,
    reloadTick: 0,
  });
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

  const [debugVisible, setDebugVisible] = useState(false);
  const branchSelectReference = useRef<HTMLButtonElement | undefined>(undefined);
  const branchSelectReferenceCallback: RefCallback<HTMLButtonElement> = useCallback((node) => {
    branchSelectReference.current = node ?? undefined;
  }, []);
  const commandStack = useCommandStack();

  const [temporalState, temporalActions] = useTemporalPanel();

  useEffect(() => {
    onSelectionChange?.(selectionState.selection);
  }, [onSelectionChange, selectionState.selection]);

  useEffect(() => {
    if (temporalState.branch || temporalState.commitId) {
      track('time.cursor', { branch: temporalState.branch, commitId: temporalState.commitId });
    }
  }, [temporalState.branch, temporalState.commitId]);

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

  const refreshProjects = useCallback(async () => {
    setProjectState((previous) => ({ ...previous, loading: true, error: undefined }));
    try {
      const projects = await listProjectsWithScenarios();
      const scenarios = projects.flatMap((project) => project.scenarios);
      setProjectState({ loading: false, data: projects });
      setScenarioState({ loading: false, data: scenarios });
      setActiveScenarioId((previous) => {
        if (previous) {
          return previous;
        }
        const defaultScenario = scenarios.find((scenario) => scenario.isDefault) ?? scenarios[0];
        return defaultScenario?.id;
      });
    } catch (unknownError) {
      const message = toErrorMessage(unknownError);
      setProjectState({ loading: false, data: [], error: message });
      setScenarioState({ loading: false, data: [], error: message });
    }
  }, []);

  useEffect(() => {
    refreshTemplates().catch((_ignoredError: unknown) => {
      return;
    });
    refreshProjects().catch((_ignoredError: unknown) => {
      return;
    });
  }, [refreshProjects, refreshTemplates]);

  const activeScenario = useMemo(() => {
    const preferred =
      scenarioState.data.find((scenario) => scenario.id === activeScenarioId) ??
      scenarioState.data.find((scenario) => scenario.isDefault);
    return preferred ?? scenarioState.data[0];
  }, [activeScenarioId, scenarioState.data]);

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
  }, [activeScenarioId, scenarioState.data, scenarioState.loading, temporalState.branch]);

  const activeTemplate = useMemo(() => {
    return (
      templatesState.data.find((entry) => entry.id === activeTemplateId) ?? templatesState.data[0]
    );
  }, [activeTemplateId, templatesState.data]);

  const runtimeScenario = temporalState.branch ?? activeScenario?.branch;
  const runtimeAsOf = temporalState.commitId ?? runtimeScenario;
  const runtimeLayer = temporalState.layer;

  const widgets = useMemo<CanvasWidget[]>(() => {
    if (!activeTemplate || !runtimeAsOf) {
      return [];
    }
    return instantiateLayout(activeTemplate, {
      scenario: runtimeScenario,
      asOf: runtimeAsOf,
      layer: runtimeLayer,
    });
  }, [activeTemplate, runtimeAsOf, runtimeLayer, runtimeScenario]);

  const { canvasLayoutKey, graphLayoutContext, canvasLayoutPersistence } = useCanvasLayout({
    documentId: activeTemplate?.documentId,
    asOf: runtimeAsOf,
    scenario: runtimeScenario,
    layer: runtimeLayer,
  });

  const selectionKind = deriveSelectionKind(selectionState.selection);
  const selectionId = primarySelectionId(selectionState.selection);
  const selectedProperties = resolveSelectedProperties(
    selectionState,
    selectionKind,
    selectionId,
    graphViewCache,
  );

  const handleSelectionChange = useCallback(
    (next: SelectionState) => {
      const previous = selectionState.selection;
      const normalised: SelectionState = {
        sourceWidgetId: next.sourceWidgetId,
        nodeIds: dedupeIds(next.nodeIds),
        edgeIds: dedupeIds(next.edgeIds),
        cellIds: dedupeIds(next.cellIds),
      };
      setSelection(normalised);
      commandStack.record({
        label: t('selectionChange'),
        redo: () => {
          setSelection(normalised);
        },
        undo: () => {
          setSelection(previous);
        },
      });
      track('selection.change', {
        kind: deriveSelectionKind(normalised),
        sourceWidgetId: normalised.sourceWidgetId,
        nodeCount: normalised.nodeIds.length,
        edgeCount: normalised.edgeIds.length,
      });
    },
    [commandStack, selectionState.selection, setSelection, t],
  );

  const handleTemplateChange = useCallback(
    (templateId: string) => {
      const previous = activeTemplateId;
      setActiveTemplateId(templateId);
      clear();
      commandStack.record({
        label: t('templateChange'),
        redo: () => {
          setActiveTemplateId(templateId);
        },
        undo: () => {
          setActiveTemplateId(previous);
        },
      });
      track('template.change', { templateId, scenarioId: activeScenario?.id });
    },
    [activeScenario?.id, activeTemplateId, clear, commandStack, t],
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
    [activeScenario?.id],
  );

  const handleTemplateSave = useCallback(() => {
    if (widgets.length === 0) {
      return;
    }
    const nextIndexLabel = (templatesState.data.length + 1).toString();
    const name = t('templateName', { number: nextIndexLabel });
    const snapshot = captureLayoutFromWidgets(name, t('savedFromRuntime'), widgets);
    const saveTemplate = async () => {
      const saved = await saveLayoutToHost(snapshot);
      commitTemplate(saved);
    };
    void saveTemplate();
  }, [commitTemplate, t, templatesState.data.length, widgets]);

  const handleScenarioSelect = useCallback(
    (scenarioId: string) => {
      const previous = activeScenarioId;
      setActiveScenarioId(scenarioId);
      clear();
      commandStack.record({
        label: t('scenarioChange'),
        redo: () => {
          setActiveScenarioId(scenarioId);
        },
        undo: () => {
          setActiveScenarioId(previous);
        },
      });
    },
    [activeScenarioId, clear, commandStack, t],
  );

  const handleWidgetCreate = useCallback(
    (type: WidgetKind) => {
      if (!activeTemplate) {
        return;
      }
      const entry = listWidgetRegistry().find((item) => item.type === type);
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
        data: previous.data.map((template) =>
          template.id === activeTemplate.id ? newTemplate : template,
        ),
      }));
      setActiveTemplateId(newTemplate.id);
      setFromWidget({ widgetId: newWidgetId, nodeIds: [], edgeIds: [], cellIds: [] });
      setWidgetLibraryOpen(false);
      track('template.create_widget', { widgetType: type, templateId: newTemplate.id });
    },
    [activeTemplate, setFromWidget],
  );

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
          const result = await applyInspectorPatch({
            kind,
            id,
            patch,
            selectedProperties,
            branch,
          });
          if (!result) {
            return;
          }
          if (!result.accepted) {
            throw new Error(result.message ?? t('operationRejected'));
          }
          if (result.commitId) {
            if (branch) {
              await temporalActions.selectBranch(branch);
            }
            temporalActions.selectCommit(result.commitId);
          }
          setPropertyState((previous) => ({ ...previous, reloadTick: previous.reloadTick + 1 }));
          track('inspector.save', { selectionKind: kind, selectionId: id });
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
      t,
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

  const toggleDebug = useCallback(() => {
    setDebugVisible((previous) => !previous);
  }, []);

  usePlatformShortcuts({
    commandStack,
    temporalState,
    temporalActions,
    branchSelectReference,
    onToggleDebug: toggleDebug,
  });

  const handleRetryProjects = useCallback(() => {
    refreshProjects().catch((_ignoredError: unknown) => {
      return;
    });
  }, [refreshProjects]);

  const contextValue = useMemo<HostPlatformContextValue>(() => {
    return {
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
      onCreateWidget: () => {
        setWidgetLibraryOpen(true);
      },
      onSelectScenario: handleScenarioSelect,
      onRetryProjects: handleRetryProjects,
      onSelectionChange: handleSelectionChange,
      onInspectorSave: handleInspectorSave,
      onInspectorReset: handleInspectorReset,
      onGraphViewChange: handleGraphViewChange,
      debugVisible,
      widgetLibraryOpen,
      onToggleWidgetLibrary: setWidgetLibraryOpen,
      onCreateWidgetType: handleWidgetCreate,
    };
  }, [
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
    widgetLibraryOpen,
    widgets,
  ]);

  return (
    <HostPlatformContext.Provider value={contextValue}>{children}</HostPlatformContext.Provider>
  );
}
