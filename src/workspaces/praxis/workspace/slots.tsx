import { isDevelopmentBuild } from 'lib/runtime';
import { PraxisWorkspaceToolbar as PraxisWorkspaceToolbarChrome } from 'praxis/components/chrome/praxis-workspace-toolbar';
import { DebugOverlay } from 'praxis/components/debug-overlay';
import { OverviewTabs } from 'praxis/components/template-screen/overview-tabs';
import { ProjectsSidebar } from 'praxis/components/template-screen/projects-sidebar';
import { PropertiesInspector } from 'praxis/components/template-screen/properties-inspector';
import type { SelectionState } from 'praxis/types';
import { listWidgetRegistry } from 'praxis/widgets/registry';
import type { WorkspaceNavigationProperties } from 'workspaces/types';

import { usePraxisWorkspaceContext } from './context';
import { PraxisWorkspaceProvider } from './state-provider';
import { WidgetLibraryDialog } from './widget-library-dialog';

const debugEnabled = isDevelopmentBuild();

/**
 * Entry point for the Praxis workspace renderer.
 * @returns Workspace route content.
 */
export default function App() {
  return <PraxisWorkspaceSurface />;
}

/**
 * Exposes the full Praxis workspace as a self-contained surface; forwards
 * selection changes to the host.
 * @param root0 - Surface props.
 * @param root0.onSelectionChange - Invoked when the global selection changes.
 */
export function PraxisWorkspaceSurface({
  onSelectionChange,
}: {
  readonly onSelectionChange?: (selection: SelectionState) => void;
} = {}) {
  const navigationProperties: WorkspaceNavigationProperties = {
    activeWorkspaceId: 'praxis',
    workspaceOptions: [{ id: 'praxis', label: 'Praxis', disabled: false }],
    onWorkspaceSelect: () => {
      return;
    },
  };

  return (
    <PraxisWorkspaceProvider onSelectionChange={onSelectionChange}>
      <PraxisWorkspaceNavigation {...navigationProperties} />
      <PraxisWorkspaceToolbar />
      <PraxisWorkspaceContent />
      <PraxisWorkspaceInspector />
    </PraxisWorkspaceProvider>
  );
}

/**
 * Navigation slot — projects and scenarios sidebar.
 * @param _ - Workspace navigation props (unused; navigation is context-driven).
 */
export function PraxisWorkspaceNavigation(_: Readonly<WorkspaceNavigationProperties>) {
  const { projectState, scenarioState, activeScenarioId, onSelectScenario, onRetryProjects } =
    usePraxisWorkspaceContext();

  return (
    <ProjectsSidebar
      projects={projectState.data}
      scenarios={scenarioState.data}
      loading={projectState.loading}
      error={projectState.error}
      activeScenarioId={activeScenarioId}
      onSelectScenario={onSelectScenario}
      onRetry={onRetryProjects}
    />
  );
}

/**
 * Toolbar slot — template selector and temporal controls.
 */
export function PraxisWorkspaceToolbar() {
  const {
    templateName,
    templatesState,
    activeTemplateId,
    onTemplateChange,
    onTemplateSave,
    onCreateWidget,
    temporalState,
    temporalActions,
  } = usePraxisWorkspaceContext();

  return (
    <PraxisWorkspaceToolbarChrome
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
 * Content slot — canvas runtime with widgets, debug overlay, and widget library.
 */
export function PraxisWorkspaceContent() {
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
  } = usePraxisWorkspaceContext();

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
        registry={listWidgetRegistry()}
        onCreate={onCreateWidgetType}
      />
    </>
  );
}

/**
 * Inspector slot — properties inspector for the current selection.
 */
export function PraxisWorkspaceInspector() {
  const {
    selection,
    selectionKind,
    selectionId,
    selectedProperties,
    propertyState,
    onInspectorSave,
    onInspectorReset,
  } = usePraxisWorkspaceContext();

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
