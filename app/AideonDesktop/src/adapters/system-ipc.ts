import { invokeIpc } from './ipc';

export type SetupTask = 'frontend' | 'backend';

export const SYSTEM_IPC_COMMANDS = {
  setupComplete: 'system_setup_complete',
  windowOpen: 'system_window_open',
} as const;

/**
 * Mark the host setup task as complete using the typed IPC envelope.
 * @param task
 */
export async function setSetupComplete(task: SetupTask): Promise<void> {
  await invokeIpc(SYSTEM_IPC_COMMANDS.setupComplete, { task });
}

/**
 * Open the UI style guide window using the typed IPC envelope.
 */
export async function openStyleguideWindow(): Promise<void> {
  await invokeIpc(SYSTEM_IPC_COMMANDS.windowOpen, { window: 'styleguide' });
}
