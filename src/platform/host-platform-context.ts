import { createContext, useContext, type RefCallback } from 'react';

import type { CanvasRuntimeLayoutPersistence } from 'aideon/canvas/canvas-runtime';
import type { ProjectSummary } from 'praxis/domain-data';
import type { LayoutPreset } from 'praxis/layouts';
import type { ScenarioSummary } from 'praxis/praxis-api';
import type {
  PraxisCanvasWidget as CanvasWidget,
  GraphLayoutContext,
  PraxisWidgetViewEvent,
  SelectionKind,
  SelectionState,
  PraxisWidgetKind as WidgetKind,
} from 'praxis/types';

import type { SelectionProperties } from 'praxis/stores/selection-store';
import type { useTemporalPanel } from 'praxis/time/use-temporal-panel';

export interface ScenarioState {
  loading: boolean;
  error?: string;
  data: ScenarioSummary[];
}

export interface HostPlatformContextValue {
  readonly projectState: {
    loading: boolean;
    data: ProjectSummary[];
    error?: string;
  };
  readonly scenarioState: ScenarioState;
  readonly templatesState: {
    loading: boolean;
    data: LayoutPreset[];
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

export const HostPlatformContext = createContext<HostPlatformContextValue | undefined>(undefined);

/**
 * Access the Praxis workspace context; throws when rendered outside the provider.
 */
export function useHostPlatform(): HostPlatformContextValue {
  const context = useContext(HostPlatformContext);
  if (!context) {
    throw new Error('Praxis workspace components must be rendered within HostPlatformProvider.');
  }
  return context;
}
