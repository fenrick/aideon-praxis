import { useCallback, useState } from 'react';

import { AideonDesktopNavigation } from 'aideon/shell/aideon-desktop-navigation';
import { AideonDesktopShell } from 'aideon/shell/aideon-desktop-shell';
import { AideonToolbar } from 'aideon/shell/aideon-toolbar';
import { isTauriRuntime } from 'lib/runtime';
import { getWorkspace, getWorkspaceOptions } from './workspaces/registry';
import type { WorkspaceId } from './workspaces/types';

const ACTIVE_WORKSPACE_STORAGE_KEY = 'aideon.active-workspace';

/**
 *
 */
function readStoredWorkspaceId(): WorkspaceId | undefined {
  if (typeof globalThis === 'undefined') {
    return undefined;
  }
  const storage = (globalThis as { localStorage?: Storage }).localStorage;
  if (!storage) {
    return undefined;
  }
  try {
    const stored = storage.getItem(ACTIVE_WORKSPACE_STORAGE_KEY);
    if (stored === 'praxis' || stored === 'metis' || stored === 'mneme') {
      return stored;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

/**
 *
 * @param id
 */
function persistWorkspaceId(id: WorkspaceId) {
  if (typeof globalThis === 'undefined') {
    return;
  }
  const storage = (globalThis as { localStorage?: Storage }).localStorage;
  if (!storage) {
    return;
  }
  try {
    storage.setItem(ACTIVE_WORKSPACE_STORAGE_KEY, id);
  } catch {
    return;
  }
}

/**
 *
 */
function EmptyInspector() {
  return <div className="text-muted-foreground p-4 text-sm">No inspector available.</div>;
}

/**
 * Application root that hosts the active workspace inside the desktop shell.
 *
 * The shell is module-agnostic: each workspace module owns its own context
 * provider (`ws.Provider`) and declares how its content fills the surface
 * (`ws.contentLayout`). The root only switches between modules and renders
 * their slots into the shell — it holds no module-specific state.
 */
export function AideonDesktopRoot() {
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<WorkspaceId>(
    () => readStoredWorkspaceId() ?? 'praxis',
  );
  const ws = getWorkspace(activeWorkspaceId);
  const workspaceOptions = getWorkspaceOptions();

  const handleWorkspaceSelect = useCallback((workspaceId: WorkspaceId) => {
    const resolved = getWorkspace(workspaceId);
    setActiveWorkspaceId(resolved.id);
    persistWorkspaceId(resolved.id);
  }, []);

  const WorkspaceProvider = ws.Provider;
  const WorkspaceNavigation = ws.Navigation;
  const WorkspaceToolbar = ws.Toolbar;
  const WorkspaceContent = ws.Content;
  const WorkspaceInspector = ws.Inspector ?? EmptyInspector;

  const modeLabel = isTauriRuntime() ? 'Desktop' : undefined;

  const shell = (
    <AideonDesktopShell
      key={ws.id}
      contentLayout={ws.contentLayout}
      navigation={
        <AideonDesktopNavigation
          activeWorkspaceId={ws.id}
          workspaceOptions={workspaceOptions}
          onWorkspaceSelect={handleWorkspaceSelect}
        >
          <WorkspaceNavigation
            activeWorkspaceId={ws.id}
            workspaceOptions={workspaceOptions}
            onWorkspaceSelect={handleWorkspaceSelect}
          />
        </AideonDesktopNavigation>
      }
      toolbar={
        <AideonToolbar
          title="Aideon"
          subtitle={`${ws.label} workspace`}
          modeLabel={modeLabel}
          workspaceToolbar={WorkspaceToolbar ? <WorkspaceToolbar /> : undefined}
        />
      }
      content={<WorkspaceContent />}
      inspector={<WorkspaceInspector />}
    />
  );

  return WorkspaceProvider ? <WorkspaceProvider key={ws.id}>{shell}</WorkspaceProvider> : shell;
}
