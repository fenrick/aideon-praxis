import { invokeIpc } from './ipc';

export type SetupTask = 'frontend' | 'backend';

export const SYSTEM_IPC_COMMANDS = {
  setupComplete: 'system_setup_complete',
  setupState: 'system_setup_state',
  windowOpen: 'system_window_open',
  loggingContext: 'system_logging_context',
} as const;

/**
 * Mark the host setup task as complete using the typed IPC envelope.
 * @param task
 */
export async function setSetupComplete(task: SetupTask): Promise<void> {
  await invokeIpc(SYSTEM_IPC_COMMANDS.setupComplete, { task });
}

export interface SetupStateFlags {
  readonly frontend: boolean;
  readonly backend: boolean;
}

/**
 * Read the host setup state (one-time query; avoid polling).
 */
export async function getSetupState(): Promise<SetupStateFlags> {
  return invokeIpc<SetupStateFlags>(SYSTEM_IPC_COMMANDS.setupState, {});
}

/**
 * Open the UI style guide window using the typed IPC envelope.
 */
export async function openStyleguideWindow(): Promise<void> {
  await invokeIpc(SYSTEM_IPC_COMMANDS.windowOpen, { window: 'styleguide' });
}

/**
 * Open the Status window using the typed IPC envelope.
 */
export async function openStatusWindow(): Promise<void> {
  await invokeIpc(SYSTEM_IPC_COMMANDS.windowOpen, { window: 'status' });
}
