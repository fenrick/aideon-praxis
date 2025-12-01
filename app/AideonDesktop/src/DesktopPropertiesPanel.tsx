import { Card, CardContent, CardHeader, CardTitle } from '@aideon/design-system/components/ui/card';
import { ScrollArea } from '@aideon/design-system/components/ui/scroll-area';

import type { SelectionState } from '@aideon/PraxisCanvas';

export interface DesktopPropertiesPanelProperties {
  readonly selection?: SelectionState;
}

export function DesktopPropertiesPanel({ selection }: DesktopPropertiesPanelProperties) {
  const hasSelection = Boolean(selection && (selection.nodeIds.length || selection.edgeIds.length));

  return (
    <ScrollArea className="h-full">
      <div className="p-4">
        <Card className="border-border/60 bg-card/90 shadow-sm">
          <CardHeader>
            <CardTitle>Properties</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            {!hasSelection ? (
              <p>No selection yet. Pick a node or edge to see details.</p>
            ) : (
              <>
                <p>
                  Nodes selected: <span className="text-foreground">{selection?.nodeIds.length}</span>
                </p>
                <p>
                  Edges selected: <span className="text-foreground">{selection?.edgeIds.length}</span>
                </p>
                {selection?.sourceWidgetId ? (
                  <p>Source widget: {selection.sourceWidgetId}</p>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
