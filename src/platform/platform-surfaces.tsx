import type { PraxisWidgetKind as WidgetKind } from 'praxis/types';

import { useHostPlatform } from './host-platform-context';
import { useWidgetCatalog } from './widget-catalog';
import { WidgetLibraryDialog } from './widget-library-dialog';

/** Toolbar slot — not yet implemented. */
export function PlatformToolbar(): undefined {
  return undefined;
}

/** Content slot — widget library dialog; canvas surface not yet implemented. */
export function PlatformContent() {
  const { widgetLibraryOpen, onToggleWidgetLibrary, onCreateWidgetType } = useHostPlatform();
  const catalog = useWidgetCatalog();

  return (
    <WidgetLibraryDialog
      open={widgetLibraryOpen}
      onOpenChange={onToggleWidgetLibrary}
      widgets={catalog.widgets}
      onCreate={(type) => {
        onCreateWidgetType(type as WidgetKind);
      }}
    />
  );
}

/** Inspector slot — not yet implemented. */
export function PlatformInspector(): undefined {
  return undefined;
}
