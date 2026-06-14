import { isDevelopmentBuild } from 'lib/runtime';
import { PraxisWorkspaceToolbar as PlatformToolbarChrome } from 'praxis/components/chrome/praxis-workspace-toolbar';
import { DebugOverlay } from 'praxis/components/debug-overlay';
import { OverviewTabs } from 'praxis/components/template-screen/overview-tabs';
import { PropertiesInspector } from 'praxis/components/template-screen/properties-inspector';
import type { PraxisWidgetKind as WidgetKind } from 'praxis/types';

import { useHostPlatform } from './host-platform-context';
import { useWidgetCatalog } from './widget-catalog';
import { WidgetLibraryDialog } from './widget-library-dialog';

const debugEnabled = isDevelopmentBuild();

/**
 * Toolbar slot — layout-preset selector and the viewpoint controls.
 */
export function PlatformToolbar() {
  const {
    templateName,
    templatesState,
    activeTemplateId,
    onTemplateChange,
    onTemplateSave,
    onCreateWidget,
    temporalState,
    temporalActions,
  } = useHostPlatform();

  return (
    <PlatformToolbarChrome
      templateName={templateName}
      templates={templatesState.data}
      activeTemplateId={activeTemplateId}
      onTemplateChange={onTemplateChange}
      onTemplateSave={onTemplateSave}
      onCreateWidget={onCreateWidget}
      temporalState={temporalState}
      temporalActions={temporalActions}
      loading={templatesState.loading}
    />
  );
}

/**
 * Content slot — the widget canvas, debug overlay, and widget library (fed by
 * the licensed-engine widget catalog).
 */
export function PlatformContent() {
  const {
    temporalState,
    temporalActions,
    widgets,
    canvasLayoutKey,
    canvasLayoutPersistence,
    graphLayoutContext,
    selection,
    onSelectionChange,
    onGraphViewChange,
    branchSelectReferenceCallback,
    propertyState,
    debugVisible,
    scenarioName,
    templateName,
    widgetLibraryOpen,
    onToggleWidgetLibrary,
    onCreateWidgetType,
  } = useHostPlatform();
  const catalog = useWidgetCatalog();

  return (
    <>
      <div className="space-y-6">
        <OverviewTabs
          state={temporalState}
          actions={temporalActions}
          widgets={widgets}
          canvasLayoutKey={canvasLayoutKey}
          canvasLayoutPersistence={canvasLayoutPersistence}
          graphLayoutContext={graphLayoutContext}
          selection={selection}
          onSelectionChange={onSelectionChange}
          onGraphViewChange={onGraphViewChange}
          onRequestMetaModelFocus={(types) => {
            if (types.length === 0) {
              return;
            }
          }}
          reloadSignal={propertyState.reloadTick}
          branchTriggerRef={branchSelectReferenceCallback}
          onAddWidget={() => {
            onToggleWidgetLibrary(true);
          }}
        />
      </div>
      <DebugOverlay
        visible={debugVisible && debugEnabled}
        scenarioName={scenarioName}
        templateName={templateName}
        selection={selection}
        branch={temporalState.branch}
        commitId={temporalState.commitId}
      />
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

/**
 * Inspector slot — properties inspector for the current selection.
 */
export function PlatformInspector() {
  const {
    selection,
    selectionKind,
    selectionId,
    selectedProperties,
    propertyState,
    onInspectorSave,
    onInspectorReset,
  } = useHostPlatform();

  return (
    <PropertiesInspector
      key={selectionId ?? 'none'}
      selection={selection}
      selectionKind={selectionKind ?? 'none'}
      selectionId={selectionId}
      properties={selectedProperties}
      onSave={onInspectorSave}
      onReset={onInspectorReset}
      saving={propertyState.saving}
      error={propertyState.error}
    />
  );
}
