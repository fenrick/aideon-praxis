import { listen } from '@tauri-apps/api/event';

import type { WorkspaceReadinessEvent } from './ipc-bindings.gen';

const READY_READ_WRITE_EVENT = 'workspace:ready_read_write';

/**
 * Resolve on the next proof-carrying `workspace:ready_read_write` event
 * ([ADR-0040]) — the host's signal that an accepted rebuild completed and
 * read-write is safe again. One-shot: the listener detaches after firing.
 */
export async function waitForWorkspaceReady(): Promise<WorkspaceReadinessEvent> {
  return new Promise((resolve) => {
    let unlisten: (() => void) | undefined;
    let fired = false;
    const detach = () => {
      if (fired && unlisten !== undefined) {
        unlisten();
      }
    };
    void listen<WorkspaceReadinessEvent>(READY_READ_WRITE_EVENT, (event) => {
      fired = true;
      detach();
      resolve(event.payload);
    }).then((handle) => {
      unlisten = handle;
      detach();
      return handle;
    });
  });
}
