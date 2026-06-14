import type { ReactElement } from 'react';

import type {
  CanvasWidgetLayout,
  SelectionState,
  WidgetSelection,
  WidgetSize,
} from 'aideon/canvas/types';

/**
 * A functional engine that contributes capability to the host platform. Engines
 * are gated by licensing — an unlicensed engine contributes nothing.
 */
export type EngineId =
  | 'praxis'
  | 'metis'
  | 'mneme'
  | 'chrona'
  | 'continuum'
  | 'kairos'
  | 'lexis'
  | 'pylon'
  | 'sophia'
  | 'kerux';

/**
 * Context the host content surface passes to an engine when rendering one of its
 * widgets. Host-generic; engine-specific payloads ride in `layoutContext`.
 */
export interface WidgetRenderContext {
  readonly reloadVersion: number;
  readonly selection: SelectionState;
  readonly onSelection: (event: WidgetSelection) => void;
  readonly onViewChange?: (event: { widgetId: string; view: unknown }) => void;
  readonly onError?: (event: { widgetId: string; message: string }) => void;
  readonly onRequestFocus?: (types: string[]) => void;
  readonly layoutContext?: unknown;
}

/**
 * A widget an engine offers to the host. Listed in the widget library and
 * instantiated into the active layout when added.
 */
export interface WidgetContribution {
  readonly engineId: EngineId;
  readonly type: string;
  readonly label: string;
  readonly description: string;
  readonly icon: string;
  readonly defaultSize: WidgetSize;
  /** Seed a new widget instance of this type. */
  readonly createWidget: (id: string) => CanvasWidgetLayout;
}

/**
 * An engine's registration with the host: its widget contributions and the
 * dispatcher that renders one of its widgets into the content surface.
 */
export interface EngineDefinition {
  readonly id: EngineId;
  readonly label: string;
  readonly widgets: readonly WidgetContribution[];
  readonly renderWidget: (
    widget: CanvasWidgetLayout,
    context: WidgetRenderContext,
  ) => ReactElement | undefined;
}
