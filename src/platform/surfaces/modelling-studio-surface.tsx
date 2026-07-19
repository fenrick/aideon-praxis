import { Button } from 'design-system';
import { Plus } from 'design-system/icons';
import { useTranslations } from 'next-intl';

import type { PraxisWidgetKind as WidgetKind } from 'praxis/types';

import { ToposCanvasSurface } from 'aideon/canvas/topos-canvas-surface';

import { useHostPlatform } from '../host-platform-context';
import { useWidgetCatalog } from '../widget-catalog';
import { WidgetLibraryDialog } from '../widget-library-dialog';

/**
 * On-canvas Add-widget affordance: the second of the canonical action's three
 * entry points (toolbar, on-canvas +, command palette — issue #440), all
 * calling the same `onToggleWidgetLibrary` reference.
 * @param root0 - Component props.
 * @param root0.onAddWidget - Opens the widget-library dialog.
 */
function AddWidgetCanvasButton({ onAddWidget }: { readonly onAddWidget: () => void }) {
  const t = useTranslations('platform.toolbar');
  return (
    <Button
      type="button"
      variant="secondary"
      size="icon"
      aria-label={t('addWidget')}
      className="absolute right-4 bottom-4 z-10 rounded-full shadow-md"
      onClick={onAddWidget}
    >
      <Plus aria-hidden className="size-5" />
    </Button>
  );
}

/**
 * Modelling studio surface (free composition): the edge-to-edge Topos canvas
 * plus the widget-library dialog used to add widgets to the active layout. The
 * canvas is empty until a workspace or template instantiates widgets.
 */
export function ModellingStudioSurface() {
  const { widgetLibraryOpen, onToggleWidgetLibrary, onCreateWidgetType } = useHostPlatform();
  const catalog = useWidgetCatalog();

  return (
    <div className="relative size-full">
      <ToposCanvasSurface />
      <AddWidgetCanvasButton
        onAddWidget={() => {
          onToggleWidgetLibrary(true);
        }}
      />
      <WidgetLibraryDialog
        open={widgetLibraryOpen}
        onOpenChange={onToggleWidgetLibrary}
        widgets={catalog.widgets}
        onCreate={(type) => {
          onCreateWidgetType(type as WidgetKind);
        }}
      />
    </div>
  );
}
