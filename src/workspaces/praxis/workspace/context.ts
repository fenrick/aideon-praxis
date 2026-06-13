import { createContext, useContext, type RefCallback } from 'react';

import type { CanvasRuntimeLayoutPersistence } from 'aideon/canvas/canvas-runtime';
import type { SelectionKind } from 'praxis/components/template-screen/properties-inspector';
import type { ProjectSummary } from 'praxis/domain-data';
import type { ScenarioSummary } from 'praxis/praxis-api';
import type { CanvasTemplate } from 'praxis/templates';
import type {
  PraxisCanvasWidget as CanvasWidget,
  GraphLayoutContext,
  PraxisWidgetViewEvent,
  SelectionState,
  PraxisWidgetKind as WidgetKind,
} from 'praxis/types';

import type { SelectionProperties } from '../stores/selection-store';
import type { useTemporalPanel } from '../time/use-temporal-panel';

export interface ScenarioState {
  loading: boolean;
  error?: string;
  data: ScenarioSummary[];
}

export interface PraxisWorkspaceContextValue {
  readonly projectState: {
    loading: boolean;
    data: ProjectSummary[];
    error?: string;
  };
  readonly scenarioState: ScenarioState;
  readonly templatesState: {
    loading: boolean;
    data: CanvasTemplate[];
    error?: string;
  };
  readonly activeTemplateId: string;
  readonly activeScenarioId?: string;
  readonly templateName?: string;
  readonly scenarioName?: string;
  readonly widgets: CanvasWidget[];
  readonly selection: SelectionState;
  readonly selectedProperties?: SelectionProperties;
  readonly selectionKind?: SelectionKind;
  readonly selectionId?: string;
  readonly propertyState: {
    saving: boolean;
    error?: string;
    reloadTick: number;
  };
  readonly temporalState: ReturnType<typeof useTemporalPanel>[0];
  readonly temporalActions: ReturnType<typeof useTemporalPanel>[1];
  readonly canvasLayoutKey?: string;
  readonly canvasLayoutPersistence?: CanvasRuntimeLayoutPersistence<CanvasWidget>;
  readonly graphLayoutContext?: GraphLayoutContext;
  readonly branchSelectReferenceCallback: RefCallback<HTMLButtonElement>;
  readonly onTemplateChange: (templateId: string) => void;
  readonly onTemplateSave: () => void;
  readonly onCreateWidget: () => void;
  readonly onSelectScenario: (scenarioId: string) => void;
  readonly onRetryProjects: () => void;
  readonly onSelectionChange: (selection: SelectionState) => void;
  readonly onInspectorSave: (patch: Record<string, string | undefined>) => void;
  readonly onInspectorReset: () => void;
  readonly onGraphViewChange: (event: PraxisWidgetViewEvent) => void;
  readonly debugVisible: boolean;
  readonly widgetLibraryOpen: boolean;
  readonly onToggleWidgetLibrary: (open: boolean) => void;
  readonly onCreateWidgetType: (type: WidgetKind) => void;
}

export const PraxisWorkspaceContext = createContext<PraxisWorkspaceContextValue | undefined>(
  undefined,
);

/**
 * Access the Praxis workspace context; throws when rendered outside the provider.
 */
export function usePraxisWorkspaceContext(): PraxisWorkspaceContextValue {
  const context = useContext(PraxisWorkspaceContext);
  if (!context) {
    throw new Error('Praxis workspace components must be rendered within PraxisWorkspaceProvider.');
  }
  return context;
}
