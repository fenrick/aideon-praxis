import type { PraxisWidgetKind as WidgetKind } from 'praxis/types';

import { ToposCanvasSurface } from 'aideon/canvas/topos-canvas-surface';

import { useHostPlatform } from '../host-platform-context';
import { useWidgetCatalog } from '../widget-catalog';
import { WidgetLibraryDialog } from '../widget-library-dialog';

/**
 * Modelling studio surface (free composition): the edge-to-edge Topos canvas
 * plus the widget-library dialog used to add widgets to the active layout. The
 * canvas is empty until a workspace or template instantiates widgets.
 */
export function ModellingStudioSurface() {
  const { widgetLibraryOpen, onToggleWidgetLibrary, onCreateWidgetType } = useHostPlatform();
  const catalog = useWidgetCatalog();

  return (
    <>
      <ToposCanvasSurface />
      <WidgetLibraryDialog
        open={widgetLibraryOpen}
        onOpenChange={onToggleWidgetLibrary}
        widgets={catalog.widgets}
        onCreate={(type) => {
          onCreateWidgetType(type as WidgetKind);
        }}
      />
    </>
  );
}
