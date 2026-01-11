import { invoke } from '@tauri-apps/api/core';

import { invokeIpc } from './ipc';

export type SetupTask = 'frontend' | 'backend';

export const SYSTEM_IPC_COMMANDS = {
  setupComplete: 'system.setup.complete',
  windowOpen: 'system.window.open',
} as const;

/**
 *
 * @param error
 */
function isCommandNotFound(error: unknown): boolean {
  let message = '';
  if (typeof error === 'string') {
    message = error;
  } else if (error instanceof Error) {
    message = error.message;
  }
  return /command .* not found/i.test(message);
}

/**
 *
 */
function getInternalInvoke() {
  const runtime = globalThis as typeof globalThis & {
    __TAURI_INTERNALS__?: { invoke?: (command: string, payload?: unknown) => Promise<unknown> };
  };
  return runtime.__TAURI_INTERNALS__?.invoke;
}

/**
 *
 * @param command
 * @param payload
 */
async function invokeFallbackCommand(
  command: string,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    await invoke(command, payload);
    return;
  } catch (error) {
    const invokeInternal = getInternalInvoke();
    if (!invokeInternal) {
      throw error;
    }
    await invokeInternal(command, payload);
  }
}

/**
 *
 * @param command
 * @param payload
 * @param fallbackCommand
 * @param fallbackPayload
 */
async function invokeWithFallback(
  command: string,
  payload: Record<string, unknown>,
  fallbackCommand: string,
  fallbackPayload: Record<string, unknown> = payload,
): Promise<void> {
  try {
    await invokeIpc(command, payload);
    return;
  } catch (error) {
    if (!isCommandNotFound(error)) {
      throw error;
    }
  }
  await invokeFallbackCommand(fallbackCommand, fallbackPayload);
}

/**
 * Mark the host setup task as complete using the typed IPC envelope.
 * @param task
 */
export async function setSetupComplete(task: SetupTask): Promise<void> {
  await invokeWithFallback(SYSTEM_IPC_COMMANDS.setupComplete, { task }, 'set_complete');
}

/**
 * Open the UI style guide window using the typed IPC envelope.
 */
export async function openStyleguideWindow(): Promise<void> {
  await invokeWithFallback(
    SYSTEM_IPC_COMMANDS.windowOpen,
    { window: 'styleguide' },
    'open_styleguide',
    {},
  );
}
