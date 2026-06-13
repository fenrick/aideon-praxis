import type { ComponentType, ReactElement } from 'react';

/**
 * Identifier for a workspace module. Currently the implemented modules; widen
 * this union as the planned pantheon (Kairos, Lexis, Pylon, …) registers crates.
 */
export type WorkspaceId = 'praxis' | 'metis' | 'mneme';

export interface WorkspaceNavigationProperties {
  readonly activeWorkspaceId: WorkspaceId;
  readonly onWorkspaceSelect: (workspaceId: WorkspaceId) => void;
  readonly workspaceOptions: readonly {
    readonly id: WorkspaceId;
    readonly label: string;
    readonly disabled: boolean;
  }[];
}

/**
 * How a module's content fills the shell content surface.
 * - `scroll`: padded, scrollable region. Catalogues, reports, pages.
 * - `full-bleed`: edge-to-edge, no padding, no scroll. Canvases, maps.
 */
export type WorkspaceContentLayout = 'scroll' | 'full-bleed';

export interface WorkspaceProviderProperties {
  readonly children: ReactElement;
}

export interface WorkspaceModule {
  id: WorkspaceId;
  label: string;
  enabled: boolean;

  /**
   * How the Content slot fills the shell content surface. Defaults to `scroll`.
   */
  contentLayout?: WorkspaceContentLayout;

  /**
   * Module-owned context provider. The shell wraps the active module's slots in
   * this so a module manages its own state instead of the root hardcoding it.
   */
  Provider?: ComponentType<WorkspaceProviderProperties>;

  // these map 1:1 into AideonDesktopShell slots
  Navigation: ComponentType<WorkspaceNavigationProperties>;
  Toolbar?: ComponentType;
  Content: ComponentType;
  Inspector?: ComponentType;
}
