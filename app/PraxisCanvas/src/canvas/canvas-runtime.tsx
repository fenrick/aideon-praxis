import { memo } from 'react';

import type { GraphViewModel } from '@/praxis-api';

import type { CanvasWidget, WidgetErrorEvent, WidgetSelection, WidgetViewEvent } from './types';
import { GraphWidget } from './widgets/graph-widget';

interface CanvasRuntimeProperties {
  readonly widgets: CanvasWidget[];
  readonly reloadVersion: number;
  readonly onSelectionChange?: (selection: WidgetSelection) => void;
  readonly onGraphViewChange?: (event: WidgetViewEvent) => void;
  readonly onGraphError?: (event: WidgetErrorEvent) => void;
}

export const CanvasRuntime = memo(function CanvasRuntime({
  widgets,
  reloadVersion,
  onSelectionChange,
  onGraphViewChange,
  onGraphError,
}: CanvasRuntimeProperties) {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-border/60 bg-card">
      {widgets.map((widget) => (
        <GraphWidget
          key={widget.id}
          widget={widget}
          reloadVersion={reloadVersion}
          onSelectionChange={onSelectionChange}
          onViewChange={(view: GraphViewModel) => {
            onGraphViewChange?.({ widgetId: widget.id, view });
          }}
          onError={(message: string) => {
            onGraphError?.({ widgetId: widget.id, message });
          }}
        />
      ))}
    </div>
  );
});
