import type { PraxisWidgetKind as WidgetKind } from 'praxis/types';
import { useHostPlatform } from './host-platform-context';
import { useWidgetCatalog } from './widget-catalog';
import { WidgetLibraryDialog } from './widget-library-dialog';

export function PlatformToolbar() {
  return null;
}

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

export function PlatformInspector() {
  return null;
}
