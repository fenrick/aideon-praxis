import { invokeIpc } from './ipc';
import { SYSTEM_IPC_COMMANDS } from './system-ipc';

export interface LoggingContext {
  readonly sessionId: string;
  readonly buildVersion: string;
  readonly buildCommit?: string;
  readonly platformOs: string;
  readonly platformArch: string;
}

let contextPromise: Promise<LoggingContext> | null = null;

export function getLoggingContext(): Promise<LoggingContext> {
  if (!contextPromise) {
    contextPromise = invokeIpc<LoggingContext>(SYSTEM_IPC_COMMANDS.loggingContext, {});
  }
  return contextPromise;
}
