import type { WorkspaceModule } from 'workspaces/types';

import {
  PraxisWorkspaceContent,
  PraxisWorkspaceInspector,
  PraxisWorkspaceNavigation,
  PraxisWorkspaceProvider,
  PraxisWorkspaceToolbar,
} from './workspace';

export const PRAXIS_WORKSPACE: WorkspaceModule = {
  id: 'praxis',
  label: 'Praxis',
  enabled: true,
  contentLayout: 'full-bleed',
  Provider: PraxisWorkspaceProvider,
  Navigation: PraxisWorkspaceNavigation,
  Toolbar: PraxisWorkspaceToolbar,
  Content: PraxisWorkspaceContent,
  Inspector: PraxisWorkspaceInspector,
};
