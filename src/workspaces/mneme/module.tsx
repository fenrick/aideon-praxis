import type { WorkspaceModule, WorkspaceNavigationProperties } from 'workspaces/types';

import { Card, CardContent, CardHeader, CardTitle } from 'design-system';

/**
 *
 * @param root0
 * @param root0.message
 */
function ComingSoonCard({ message }: { readonly message?: string }) {
  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Coming soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">This workspace is not ready yet.</p>
          {message ? <p className="text-muted-foreground text-xs">{message}</p> : undefined}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 *
 * @param _
 */
function ComingSoonNavigation(_: Readonly<WorkspaceNavigationProperties>) {
  return <ComingSoonCard />;
}

/**
 *
 */
function ComingSoonContent() {
  return <ComingSoonCard />;
}

/**
 *
 */
function ComingSoonInspector() {
  return <ComingSoonCard />;
}

export const MNEME_WORKSPACE: WorkspaceModule = {
  id: 'mneme',
  label: 'Mneme',
  enabled: false,
  Navigation: ComingSoonNavigation,
  Content: ComingSoonContent,
  Inspector: ComingSoonInspector,
};
