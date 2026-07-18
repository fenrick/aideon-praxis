import { useCallback, useMemo, type ReactElement } from 'react';

import type { WidgetRenderContext } from 'platform/engine';
import { useHostPlatform } from 'platform/host-platform-context';
import { useWidgetCatalog } from 'platform/widget-catalog';
import type { PraxisCanvasWidget, PraxisWidgetViewEvent } from 'praxis/types';

import { AideonCanvasRuntime } from './canvas-runtime';
import type { WidgetSelection } from './types';

/**
 * `ToposCanvasSurface` — the renderer side of Topos, the time-first canvas.
 *
 * It bridges the host platform's instantiated widgets and canvas layout into the
 * infinite `AideonCanvasRuntime`, rendering each widget through the licensed
 * engines' catalogue. The Praxis graph widget renders here, but the canvas
 * itself is Topos's concern (spatial presentation: pan/zoom/framing/selection),
 * not Praxis's — Praxis owns the widget's meaning. See
 * `docs/frontend/praxis-contributions/DESIGN.md` ("Topos: the time-first canvas").
 */
export function ToposCanvasSurface(): ReactElement {
  const host = useHostPlatform();
  const catalog = useWidgetCatalog();

  const { onSelectionChange, onGraphViewChange } = host;
  const reloadVersion = host.propertyState.reloadTick;

  // Memoised so the runtime's `renderWidget` prop is stable across renders and
  // its memoisation holds — a fresh context each render would re-render widgets.
  const renderContext = useMemo<WidgetRenderContext>(
    () => ({
      reloadVersion,
      selection: host.selection,
      // A widget reports selection as `WidgetSelection` (`widgetId`); the host's
      // selection store keys on `SelectionState` (`sourceWidgetId`). Bridge them.
      onSelection: (event: WidgetSelection) => {
        onSelectionChange({
          sourceWidgetId: event.widgetId,
          nodeIds: event.nodeIds,
          edgeIds: event.edgeIds,
          cellIds: event.cellIds,
        });
      },
      onViewChange: (event) => {
        onGraphViewChange(event as PraxisWidgetViewEvent);
      },
      layoutContext: host.graphLayoutContext,
    }),
    [reloadVersion, host.selection, host.graphLayoutContext, onSelectionChange, onGraphViewChange],
  );

  const renderWidget = useCallback(
    (widget: PraxisCanvasWidget) => catalog.renderWidget(widget, renderContext),
    [catalog, renderContext],
  );

  return (
    <AideonCanvasRuntime
      widgets={host.widgets}
      layoutKey={host.canvasLayoutKey}
      layoutPersistence={host.canvasLayoutPersistence}
      renderWidget={renderWidget}
    />
  );
}
