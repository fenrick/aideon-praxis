import type { PraxisWidgetKind as WidgetKind } from 'praxis/types';

import { ToposCanvasSurface } from 'aideon/canvas/topos-canvas-surface';
import { WorkspaceFoundationPanel } from 'aideon/workspace/workspace-foundation-panel';

import { useHostPlatform } from './host-platform-context';
import { useWidgetCatalog } from './widget-catalog';
import { WidgetLibraryDialog } from './widget-library-dialog';

/** Toolbar slot — not yet implemented. */
export function PlatformToolbar(): undefined {
  return undefined;
}

/**
 * Content slot. Renders the Topos canvas once the active template instantiates
 * widgets; otherwise the workspace-foundation gate. Plus the widget-library
 * dialog. (The full goal-oriented surface router replaces this switch next.)
 */
export function PlatformContent() {
  const { widgets, widgetLibraryOpen, onToggleWidgetLibrary, onCreateWidgetType } =
    useHostPlatform();
  const catalog = useWidgetCatalog();

  // First slice: once the active template instantiates widgets, the Topos canvas
  // is the content surface; otherwise the foundation panel remains the gate so a
  // workspace can still be opened. (The full surface router replaces this next.)
  return (
    <>
      {widgets.length > 0 ? <ToposCanvasSurface /> : <WorkspaceFoundationPanel />}
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
