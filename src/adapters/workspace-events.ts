import { listen } from '@tauri-apps/api/event';

import type { RunTerminalEvent, WorkspaceReadinessEvent } from './ipc-bindings.gen';

const READY_READ_WRITE_EVENT = 'workspace:ready_read_write';
const RUN_TERMINAL_EVENT = 'run:terminal';

export interface PreparedRunTerminal {
  readonly wait: () => Promise<RunTerminalEvent>;
}

/** Install the accepted-work listener before submitting work, avoiding a fast-job race. */
export async function prepareForRunTerminal(): Promise<PreparedRunTerminal> {
  let resolveEvent!: (event: RunTerminalEvent) => void;
  const eventPromise = new Promise<RunTerminalEvent>((resolve) => {
    resolveEvent = resolve;
  });
  const unlisten = await listen<RunTerminalEvent>(RUN_TERMINAL_EVENT, (event) => {
    unlisten();
    resolveEvent(event.payload);
  });
  return { wait: () => eventPromise };
}

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
