import type { ReactElement } from 'react';

import type { WidgetRenderContext } from 'platform/engine';
import { useHostPlatform } from 'platform/host-platform-context';
import { useWidgetCatalog } from 'platform/widget-catalog';
import type { PraxisWidgetViewEvent } from 'praxis/types';

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

  const renderContext: WidgetRenderContext = {
    reloadVersion: host.propertyState.reloadTick,
    selection: host.selection,
    // A widget reports selection as `WidgetSelection` (`widgetId`); the host's
    // selection store keys on `SelectionState` (`sourceWidgetId`). Bridge the two.
    onSelection: (event: WidgetSelection) => {
      host.onSelectionChange({
        sourceWidgetId: event.widgetId,
        nodeIds: event.nodeIds,
        edgeIds: event.edgeIds,
        cellIds: event.cellIds,
      });
    },
    onViewChange: (event) => {
      host.onGraphViewChange(event as PraxisWidgetViewEvent);
    },
    layoutContext: host.graphLayoutContext,
  };

  return (
    <AideonCanvasRuntime
      widgets={host.widgets}
      layoutKey={host.canvasLayoutKey}
      layoutPersistence={host.canvasLayoutPersistence}
      renderWidget={(widget) => catalog.renderWidget(widget, renderContext)}
    />
  );
}
