import { ScrollArea } from 'design-system';

import { WorkspaceFoundationPanel } from 'aideon/workspace/workspace-foundation-panel';

/**
 * Workspace home surface (fixed composition): the foundation gate through which
 * a workspace is opened or created. Rendered in a scrollable region so the panel
 * remains reachable at any window height.
 */
export function WorkspaceHomeSurface() {
  return (
    <ScrollArea className="h-full">
      <WorkspaceFoundationPanel />
    </ScrollArea>
  );
}
