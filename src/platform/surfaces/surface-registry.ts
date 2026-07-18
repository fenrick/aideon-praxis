import type { ComponentType } from 'react';

import {
  ClipboardCheck,
  Download,
  FileText,
  Layers,
  LayoutGrid,
  Network,
  Presentation,
  Settings2,
} from 'design-system/icons';

import { ModellingStudioSurface } from './modelling-studio-surface';
import { createPlaceholderSurface } from './placeholder-surface';
import { WorkspaceHomeSurface } from './workspace-home-surface';

/**
 * How a surface composes its content:
 * - `fixed`: a single authored layout the user cannot rearrange.
 * - `bounded`: a constrained set of arrangements.
 * - `free`: an open canvas the user composes.
 */
export type SurfaceCompositionPolicy = 'fixed' | 'bounded' | 'free';

/**
 * A goal destination the navigation rail can select. Surfaces — not engines —
 * are the navigation axis: each is a place the user goes to accomplish a goal.
 */
export interface SurfaceDefinition {
  readonly id: string;
  readonly labelKey: string;
  readonly icon: ComponentType<{ className?: string }>;
  readonly compositionPolicy: SurfaceCompositionPolicy;
  readonly Component: ComponentType;
}

/** The default surface: the workspace foundation gate. */
export const HOME_SURFACE: SurfaceDefinition = {
  id: 'home',
  labelKey: 'surfaces.home',
  icon: LayoutGrid,
  compositionPolicy: 'fixed',
  Component: WorkspaceHomeSurface,
};

/** The goal destinations, in navigation order. Administration is listed last. */
export const SURFACES: readonly SurfaceDefinition[] = [
  HOME_SURFACE,
  {
    id: 'model',
    labelKey: 'surfaces.model',
    icon: Network,
    compositionPolicy: 'free',
    Component: ModellingStudioSurface,
  },
  {
    id: 'scenarios',
    labelKey: 'surfaces.scenarios',
    icon: Layers,
    compositionPolicy: 'bounded',
    Component: createPlaceholderSurface('surfaces.scenarios'),
  },
  {
    id: 'artefacts',
    labelKey: 'surfaces.artefacts',
    icon: FileText,
    compositionPolicy: 'fixed',
    Component: createPlaceholderSurface('surfaces.artefacts'),
  },
  {
    id: 'review',
    labelKey: 'surfaces.review',
    icon: ClipboardCheck,
    compositionPolicy: 'fixed',
    Component: createPlaceholderSurface('surfaces.review'),
  },
  {
    id: 'briefings',
    labelKey: 'surfaces.briefings',
    icon: Presentation,
    compositionPolicy: 'fixed',
    Component: createPlaceholderSurface('surfaces.briefings'),
  },
  {
    id: 'import',
    labelKey: 'surfaces.import',
    icon: Download,
    compositionPolicy: 'fixed',
    Component: createPlaceholderSurface('surfaces.import'),
  },
  {
    id: 'admin',
    labelKey: 'surfaces.admin',
    icon: Settings2,
    compositionPolicy: 'fixed',
    Component: createPlaceholderSurface('surfaces.admin'),
  },
];

/**
 * Resolve a surface by id, falling back to the workspace home surface.
 * @param surfaceId - The id of the surface to resolve.
 */
export function resolveSurface(surfaceId: string): SurfaceDefinition {
  return SURFACES.find((surface) => surface.id === surfaceId) ?? HOME_SURFACE;
}
