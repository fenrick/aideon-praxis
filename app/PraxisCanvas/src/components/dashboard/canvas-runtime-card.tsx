import { useCallback, useState } from 'react';

import { CanvasRuntime } from '@/canvas/canvas-runtime';
import { fromWidgetSelection } from '@/canvas/selection';
import type {
  CanvasWidget,
  SelectionState,
  WidgetErrorEvent,
  WidgetSelection,
  WidgetViewEvent,
} from '@/canvas/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { GraphViewModel } from '@/praxis-api';

interface CanvasRuntimeCardProperties {
  readonly widgets: CanvasWidget[];
  readonly selection: SelectionState;
  readonly onSelectionChange?: (selection: SelectionState) => void;
  readonly onRequestMetaModelFocus?: (types: string[]) => void;
}

export function CanvasRuntimeCard({
  widgets,
  selection,
  onSelectionChange,
  onRequestMetaModelFocus,
}: CanvasRuntimeCardProperties) {
  const [reloadVersion, setReloadVersion] = useState(0);
  const [metadata, setMetadata] = useState<GraphViewModel['metadata'] | undefined>();
  const [stats, setStats] = useState<GraphViewModel['stats'] | undefined>();
  const [error, setError] = useState<string | undefined>();

  const handleGraphViewChange = useCallback((event: WidgetViewEvent) => {
    setMetadata(event.view.metadata);
    setStats(event.view.stats);
    setError(undefined);
  }, []);

  const handleGraphError = useCallback((event: WidgetErrorEvent) => {
    setError(event.message);
  }, []);

  const handleSelection = useCallback(
    (event: WidgetSelection) => {
      onSelectionChange?.(fromWidgetSelection(event));
    },
    [onSelectionChange],
  );

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>Canvas runtime</CardTitle>
          <CardDescription>
            {metadata
              ? `As of ${new Date(metadata.asOf).toLocaleString()} (${metadata.scenario ?? 'main'})`
              : 'React Flow GraphWidget powered by praxisApi'}
          </CardDescription>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setReloadVersion((value) => value + 1);
          }}
          disabled={widgets.length === 0}
        >
          Refresh graph
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <StatTile label="Nodes" value={stats?.nodes} />
          <StatTile label="Edges" value={stats?.edges} />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="h-[380px] w-full">
          <CanvasRuntime
            widgets={widgets}
            reloadVersion={reloadVersion}
            selection={selection}
            onSelectionChange={handleSelection}
            onGraphViewChange={handleGraphViewChange}
            onGraphError={handleGraphError}
            onRequestMetaModelFocus={onRequestMetaModelFocus}
          />
        </div>
      </CardContent>
    </Card>
  );
}

interface StatTileProperties {
  readonly label: string;
  readonly value?: number;
}

function StatTile({ label, value }: StatTileProperties) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-3xl font-semibold tracking-tight">
        {typeof value === 'number' ? value : '—'}
      </p>
    </div>
  );
}
