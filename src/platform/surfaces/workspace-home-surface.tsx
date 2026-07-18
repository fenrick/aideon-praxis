import { ScrollArea } from 'design-system';

import { WorkspaceFoundationPanel } from 'aideon/workspace/workspace-foundation-panel';

/**
 * Workspace home surface (fixed composition): the foundation gate through which
 * a workspace is opened or created. The panel is top-aligned on a subdued
 * surface token (density-and-calm) rather than dead-centred in a stark void, and
 * stays reachable at any window height via the scroll region.
 */
export function WorkspaceHomeSurface() {
  return (
    <ScrollArea className="bg-muted/20 h-full">
      <div className="pt-2">
        <WorkspaceFoundationPanel />
      </div>
    </ScrollArea>
  );
}
