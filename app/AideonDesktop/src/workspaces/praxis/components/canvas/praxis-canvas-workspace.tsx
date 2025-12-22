import { useCallback, useEffect, useRef, useState } from 'react';

import { AideonCanvasRuntime } from 'aideon/canvas/canvas-runtime';
import { fromWidgetSelection } from 'aideon/canvas/selection';
import type { SelectionState, WidgetSelection } from 'aideon/canvas/types';
import type { GraphViewModel } from 'praxis/praxis-api';

import { Badge } from 'design-system/components/ui/badge';
import { Button } from 'design-system/components/ui/button';
import { cn } from 'design-system/lib/utilities';

import type {
  PraxisCanvasWidget,
  PraxisWidgetErrorEvent,
  PraxisWidgetViewEvent,
} from 'praxis/types';
import { CatalogueWidget } from 'praxis/widgets/catalogue-widget';
import { ChartWidget } from 'praxis/widgets/chart-widget';
import { GraphWidget } from 'praxis/widgets/graph-widget';
import { MatrixWidget } from 'praxis/widgets/matrix-widget';
import type { ReactElement } from 'react';

interface RenderPraxisWidgetParameters {
  readonly widget: PraxisCanvasWidget;
  readonly reloadVersion: number;
  readonly selection: SelectionState;
  readonly onSelection: (event: WidgetSelection) => void;
  readonly onGraphViewChange: (event: PraxisWidgetViewEvent) => void;
  readonly onGraphError: (event: PraxisWidgetErrorEvent) => void;
  readonly onRequestMetaModelFocus?: (types: string[]) => void;
}

/**
 * Renders a single Praxis widget into the canvas runtime.
 * @param root0
 * @param root0.widget
 * @param root0.reloadVersion
 * @param root0.selection
 * @param root0.onSelection
 * @param root0.onGraphViewChange
 * @param root0.onGraphError
 * @param root0.onRequestMetaModelFocus
 */
function renderPraxisWidget({
  widget,
  reloadVersion,
  selection,
  onSelection,
  onGraphViewChange,
  onGraphError,
  onRequestMetaModelFocus,
}: RenderPraxisWidgetParameters): ReactElement {
  switch (widget.kind) {
    case 'graph': {
      return (
        <GraphWidget
          widget={widget}
          reloadVersion={reloadVersion}
          selection={selection}
          onSelectionChange={onSelection}
          onViewChange={(view: GraphViewModel) => {
            onGraphViewChange({ widgetId: widget.id, view });
          }}
          onError={(message: string) => {
            onGraphError({ widgetId: widget.id, message });
          }}
          onRequestMetaModelFocus={onRequestMetaModelFocus}
        />
      );
    }
    case 'catalogue': {
      return (
        <CatalogueWidget
          widget={widget}
          reloadVersion={reloadVersion}
          selection={selection}
          onSelectionChange={onSelection}
        />
      );
    }
    case 'chart': {
      return <ChartWidget widget={widget} reloadVersion={reloadVersion} />;
    }
    case 'matrix': {
      return (
        <MatrixWidget
          widget={widget}
          reloadVersion={reloadVersion}
          selection={selection}
          onSelectionChange={onSelection}
        />
      );
    }
  }
}

/**
 * Manages a local reload counter that can be bumped by signals or user action.
 * @param reloadSignal
 */
function useReloadVersion(reloadSignal?: number) {
  const [reloadVersion, setReloadVersion] = useState(0);
  const lastReloadSignal = useRef<number | undefined>(reloadSignal);

  useEffect(() => {
    if (typeof reloadSignal !== 'number' || reloadSignal === lastReloadSignal.current) {
      return;
    }

    if (lastReloadSignal.current !== undefined) {
      queueMicrotask(() => {
        setReloadVersion((value) => value + 1);
      });
    }
    lastReloadSignal.current = reloadSignal;
  }, [reloadSignal]);

  const triggerReload = useCallback(() => {
    setReloadVersion((value) => value + 1);
  }, []);

  return { reloadVersion, triggerReload };
}

export interface PraxisCanvasWorkspaceProperties {
  readonly widgets: PraxisCanvasWidget[];
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
export function PraxisCanvasWorkspace({
  widgets,
  selection,
  onSelectionChange,
  onRequestMetaModelFocus,
  reloadSignal,
}: PraxisCanvasWorkspaceProperties) {
  const { reloadVersion, triggerReload } = useReloadVersion(reloadSignal);
  const [metadata, setMetadata] = useState<GraphViewModel['metadata'] | undefined>();
  const [stats, setStats] = useState<GraphViewModel['stats'] | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [showPageBreaks, setShowPageBreaks] = useState(false);

  const handleGraphViewChange = useCallback((event: PraxisWidgetViewEvent) => {
    setMetadata(event.view.metadata);
    setStats(event.view.stats);
    setError(undefined);
  }, []);

  const handleGraphError = useCallback((event: PraxisWidgetErrorEvent) => {
    setError(event.message);
  }, []);

  const handleSelection = useCallback(
    (event: WidgetSelection) => {
      onSelectionChange?.(fromWidgetSelection(event));
    },
    [onSelectionChange],
  );

  const timestamp = metadata?.asOf ? new Date(metadata.asOf).toLocaleString() : undefined;
  const pageBreakToggle = showPageBreaks
    ? { variant: 'default' as const, label: 'Hide Pages' }
    : { variant: 'secondary' as const, label: 'Show Pages' };

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
            variant={pageBreakToggle.variant}
            size="sm"
            onClick={() => {
              setShowPageBreaks((previous) => !previous);
            }}
          >
            {pageBreakToggle.label}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={triggerReload}
            disabled={widgets.length === 0}
          >
            Refresh
          </Button>
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : undefined}

      <div className="flex-1 overflow-hidden">
        <AideonCanvasRuntime<PraxisCanvasWidget>
          widgets={widgets}
          showPageBreaks={showPageBreaks}
          renderWidget={(widget: PraxisCanvasWidget) =>
            renderPraxisWidget({
              widget,
              reloadVersion,
              selection,
              onSelection: handleSelection,
              onGraphViewChange: handleGraphViewChange,
              onGraphError: handleGraphError,
              onRequestMetaModelFocus,
            })
          }
        />
      </div>
    </div>
  );
}
