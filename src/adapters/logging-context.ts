import { invoke } from '@tauri-apps/api/core';
import { SYSTEM_IPC_COMMANDS } from './system-ipc';

export interface LoggingContext {
  readonly sessionId: string;
  readonly buildVersion: string;
  readonly buildCommit?: string;
  readonly platformOs: string;
  readonly platformArch: string;
}

let contextPromise: Promise<LoggingContext> | undefined;

/** Returns a memoized context object shared across logging consumers. */
export function getLoggingContext(): Promise<LoggingContext> {
  contextPromise ??= invoke<LoggingContext>(SYSTEM_IPC_COMMANDS.loggingContext, {});
  return contextPromise;
}
