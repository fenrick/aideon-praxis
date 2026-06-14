import type { ReactElement } from 'react';

import type { CanvasWidgetLayout } from 'aideon/canvas/types';
import type { EngineDefinition, WidgetContribution, WidgetRenderContext } from 'platform/engine';
import type { GraphViewModel } from 'praxis/praxis-api';
import type { GraphLayoutContext, PraxisCanvasWidget } from 'praxis/types';
import { CatalogueWidget } from 'praxis/widgets/catalogue-widget';
import { ChartWidget } from 'praxis/widgets/chart-widget';
import { GraphWidget } from 'praxis/widgets/graph-widget';
import { MatrixWidget } from 'praxis/widgets/matrix-widget';
import { listWidgetRegistry } from 'praxis/widgets/registry';

import { createLayoutWidget } from './layout-helpers';

const widgets: WidgetContribution[] = listWidgetRegistry().map((entry) => ({
  engineId: 'praxis',
  type: entry.type,
  label: entry.label,
  description: entry.description,
  icon: entry.icon,
  defaultSize: entry.defaultSize,
  createWidget: (id: string) => createLayoutWidget(entry, id),
}));

/**
 * Render a Praxis widget into the host content surface, adapting the host's
 * generic render context to each widget's props.
 * @param canvasWidget - The widget instance (a PraxisCanvasWidget).
 * @param context - Host render context.
 */
function renderPraxisWidget(
  canvasWidget: CanvasWidgetLayout,
  context: WidgetRenderContext,
): ReactElement | undefined {
  const widget = canvasWidget as PraxisCanvasWidget;
  const { reloadVersion, selection, onSelection, onViewChange, onError, onRequestFocus } = context;
  const graphLayoutContext = context.layoutContext as GraphLayoutContext | undefined;

  switch (widget.kind) {
    case 'graph': {
      return (
        <GraphWidget
          widget={widget}
          reloadVersion={reloadVersion}
          selection={selection}
          graphLayoutContext={graphLayoutContext}
          onSelectionChange={onSelection}
          onViewChange={(view: GraphViewModel) => {
            onViewChange?.({ widgetId: widget.id, view });
          }}
          onError={(message: string) => {
            onError?.({ widgetId: widget.id, message });
          }}
          onRequestMetaModelFocus={onRequestFocus}
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
    default: {
      return undefined;
    }
  }
}

export const PRAXIS_ENGINE: EngineDefinition = {
  id: 'praxis',
  label: 'Praxis',
  widgets,
  renderWidget: renderPraxisWidget,
};
