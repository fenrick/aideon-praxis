import { memo } from 'react';

import type { GraphViewModel } from 'canvas/praxis-api';

import type {
  CanvasWidget,
  SelectionState,
  WidgetErrorEvent,
  WidgetSelection,
  WidgetViewEvent,
} from './types';
import { CatalogueWidget } from './widgets/catalogue-widget';
import { ChartWidget } from './widgets/chart-widget';
import { GraphWidget } from './widgets/graph-widget';
import { MatrixWidget } from './widgets/matrix-widget';

interface CanvasRuntimeProperties {
  readonly widgets: CanvasWidget[];
  readonly reloadVersion: number;
  readonly selection?: SelectionState;
  readonly onSelectionChange?: (selection: WidgetSelection) => void;
  readonly onGraphViewChange?: (event: WidgetViewEvent) => void;
  readonly onGraphError?: (event: WidgetErrorEvent) => void;
  readonly onRequestMetaModelFocus?: (types: string[]) => void;
}

/**
 * Lay out and render multiple canvas widgets inside a responsive grid.
 * @param parameters - Widget list and callbacks.
 * @returns Canvas runtime surface.
 */
export const CanvasRuntime = memo(function CanvasRuntime({
  widgets,
  reloadVersion,
  selection,
  onSelectionChange,
  onGraphViewChange,
  onGraphError,
  onRequestMetaModelFocus,
}: CanvasRuntimeProperties) {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-border/60 bg-card">
      <div className="grid h-full grid-cols-1 gap-4 p-4 lg:grid-cols-2">
        {widgets.map((widget) => (
          <div key={widget.id} className={widgetColumnClass(widget)}>
            {renderWidget({
              widget,
              reloadVersion,
              selection,
              onSelectionChange,
              onGraphViewChange,
              onGraphError,
              onRequestMetaModelFocus,
            })}
          </div>
        ))}
      </div>
    </div>
  );
});

/**
 * Render an individual widget with the correct component for its kind.
 * @param parameters - Widget and associated callbacks.
 * @returns JSX element for the widget.
 */
function renderWidget(parameters: {
  widget: CanvasWidget;
  reloadVersion: number;
  selection?: SelectionState;
  onSelectionChange?: (selection: WidgetSelection) => void;
  onGraphViewChange?: (event: WidgetViewEvent) => void;
  onGraphError?: (event: WidgetErrorEvent) => void;
  onRequestMetaModelFocus?: (types: string[]) => void;
}) {
  const {
    widget,
    reloadVersion,
    selection,
    onSelectionChange,
    onGraphViewChange,
    onGraphError,
    onRequestMetaModelFocus,
  } = parameters;
  if (widget.kind === 'graph') {
    return (
      <GraphWidget
        widget={widget}
        reloadVersion={reloadVersion}
        selection={selection}
        onSelectionChange={onSelectionChange}
        onViewChange={(view: GraphViewModel) => {
          onGraphViewChange?.({ widgetId: widget.id, view });
        }}
        onError={(message: string) => {
          onGraphError?.({ widgetId: widget.id, message });
        }}
        onRequestMetaModelFocus={onRequestMetaModelFocus}
      />
    );
  }
  if (widget.kind === 'catalogue') {
    return (
      <CatalogueWidget
        widget={widget}
        reloadVersion={reloadVersion}
        selection={selection}
        onSelectionChange={onSelectionChange}
      />
    );
  }
  if (widget.kind === 'chart') {
    return <ChartWidget widget={widget} reloadVersion={reloadVersion} />;
  }
  return (
    <MatrixWidget
      widget={widget}
      reloadVersion={reloadVersion}
      selection={selection}
      onSelectionChange={onSelectionChange}
    />
  );
}

/**
 *
 * @param widget
 */
function widgetColumnClass(widget: CanvasWidget): string {
  if (widget.size === 'half') {
    return 'col-span-1';
  }
  return 'col-span-1 lg:col-span-2';
}
