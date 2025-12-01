import { Card, CardContent, CardHeader, CardTitle } from '@aideon/design-system/components/ui/card';
import { ScrollArea } from '@aideon/design-system/components/ui/scroll-area';

import type { SelectionState } from '@aideon/PraxisCanvas';

export interface DesktopPropertiesPanelProperties {
  readonly selection?: SelectionState;
}

export function DesktopPropertiesPanel({ selection }: DesktopPropertiesPanelProperties) {
  const hasSelection = Boolean(
    selection && (selection.nodeIds.length > 0 || selection.edgeIds.length > 0),
  );

  return (
    <ScrollArea className="h-full">
      <div className="p-4">
        <Card className="border-border/60 bg-card/90 shadow-sm">
          <CardHeader>
            <CardTitle>Properties</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            {hasSelection ? (
              <>
                <p>
                  Nodes selected:{' '}
                  <span className="text-foreground">{selection?.nodeIds.length}</span>
                </p>
                <p>
                  Edges selected:{' '}
                  <span className="text-foreground">{selection?.edgeIds.length}</span>
                </p>
                {selection?.sourceWidgetId ? (
                  <p>Source widget: {selection.sourceWidgetId}</p>
                ) : null}
              </>
            ) : (
              <p>No selection yet. Pick a node or edge to see details.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
