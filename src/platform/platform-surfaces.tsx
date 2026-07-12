import type { PraxisWidgetKind as WidgetKind } from 'praxis/types';

import { WorkspaceFoundationPanel } from 'aideon/workspace/workspace-foundation-panel';

import { useHostPlatform } from './host-platform-context';
import { useWidgetCatalog } from './widget-catalog';
import { WidgetLibraryDialog } from './widget-library-dialog';

/** Toolbar slot — not yet implemented. */
export function PlatformToolbar(): undefined {
  return undefined;
}

/** Content slot — the M0 workspace-foundation surface plus the widget library
 * dialog; the canvas surface arrives in a later increment. */
export function PlatformContent() {
  const { widgetLibraryOpen, onToggleWidgetLibrary, onCreateWidgetType } = useHostPlatform();
  const catalog = useWidgetCatalog();

  return (
    <>
      <WorkspaceFoundationPanel />
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

/** Inspector slot — not yet implemented. */
export function PlatformInspector(): undefined {
  return undefined;
}
