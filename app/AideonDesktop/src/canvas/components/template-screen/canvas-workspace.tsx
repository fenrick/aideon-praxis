import { useCallback, useEffect, useRef, useState } from 'react';

import { CanvasRuntime } from 'canvas/canvas-runtime';
import type { GraphViewModel } from 'canvas/praxis-api';
import { fromWidgetSelection } from 'canvas/selection';
import type {
  CanvasWidget,
  SelectionState,
  WidgetErrorEvent,
  WidgetSelection,
  WidgetViewEvent,
} from 'canvas/types';

import { Badge } from 'design-system/components/ui/badge';
import { Button } from 'design-system/components/ui/button';
import { cn } from 'design-system/lib/utilities';

export interface CanvasWorkspaceProperties {
  readonly widgets: CanvasWidget[];
  readonly selection: SelectionState;
  readonly onSelectionChange?: (selection: SelectionState) => void;
  readonly onRequestMetaModelFocus?: (types: string[]) => void;
  readonly reloadSignal?: number;
}

/**
 * Full-height canvas surface with overlay stats and actions.
 * @param root0
 * @param root0.widgets
 * @param root0.selection
 * @param root0.onSelectionChange
 * @param root0.onRequestMetaModelFocus
 * @param root0.reloadSignal
 */
export function CanvasWorkspace({
  widgets,
  selection,
  onSelectionChange,
  onRequestMetaModelFocus,
  reloadSignal,
}: CanvasWorkspaceProperties) {
  const [reloadVersion, setReloadVersion] = useState(0);
  const [metadata, setMetadata] = useState<GraphViewModel['metadata'] | undefined>();
  const [stats, setStats] = useState<GraphViewModel['stats'] | undefined>();
  const [error, setError] = useState<string | undefined>();
  const lastReloadSignal = useRef<number | undefined>(reloadSignal);

  useEffect(() => {
    if (typeof reloadSignal === 'number' && reloadSignal !== lastReloadSignal.current) {
      if (lastReloadSignal.current !== undefined) {
        queueMicrotask(() => {
          setReloadVersion((value) => value + 1);
        });
      }
      lastReloadSignal.current = reloadSignal;
    }
  }, [reloadSignal]);

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

  const timestamp = metadata?.asOf ? new Date(metadata.asOf).toLocaleString() : undefined;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-muted-foreground">
            Canvas
          </p>
          <p className="truncate text-sm text-muted-foreground">
            {timestamp ? `As of ${timestamp}` : 'React Flow canvas powered by praxisApi'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className={cn(stats ? undefined : 'opacity-60')}>
            Nodes {typeof stats?.nodes === 'number' ? stats.nodes.toLocaleString() : '—'}
          </Badge>
          <Badge variant="secondary" className={cn(stats ? undefined : 'opacity-60')}>
            Edges {typeof stats?.edges === 'number' ? stats.edges.toLocaleString() : '—'}
          </Badge>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setReloadVersion((value) => value + 1);
            }}
            disabled={widgets.length === 0}
          >
            Refresh
          </Button>
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : undefined}

      <div className="h-[72vh] min-h-[520px] w-full overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
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
    </div>
  );
}
