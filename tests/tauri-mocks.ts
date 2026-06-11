import { clearMocks, mockIPC, mockWindows } from '@tauri-apps/api/mocks';

type IpcArguments = Record<string, unknown> | undefined;

interface IpcCall {
  command: string;
  arguments_: IpcArguments;
}

interface TauriMockOptions {
  currentWindow?: string;
  additionalWindows?: string[];
  ipcHandler?: (command: string, arguments_: IpcArguments) => unknown;
  enableRuntime?: boolean;
}

const ipcCalls: IpcCall[] = [];
const LOGGING_CONTEXT_COMMAND = 'system_logging_context';

/**
 * Ensure a minimal window/document stub exists for late scheduler callbacks.
 */
function ensureWindowStub() {
  if ('window' in globalThis) {
    return;
  }
  (globalThis as unknown as { window: typeof globalThis & { event?: unknown } }).window =
    globalThis as typeof globalThis & { event?: unknown };
  if (!('document' in globalThis)) {
    (globalThis as unknown as { document: Partial<Document> }).document = {};
  }
}

/**
 * Narrow unknown values to plain object records.
 * @param value
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Extract requestId from invoke arguments.
 * @param arguments_
 */
export function requestIdFromArguments(arguments_: unknown): string | undefined {
  if (!isRecord(arguments_)) {
    return undefined;
  }
  const request = arguments_.request;
  if (!isRecord(request)) {
    return undefined;
  }
  const requestId = request.requestId;
  return typeof requestId === 'string' ? requestId : undefined;
}

/**
 * Extract request payload from invoke arguments.
 * @param arguments_
 */
export function requestPayloadFromArguments(
  arguments_: unknown,
): Record<string, unknown> | undefined {
  if (!isRecord(arguments_)) {
    return undefined;
  }
  const request = arguments_.request;
  if (!isRecord(request)) {
    return undefined;
  }
  const payload = request.payload;
  return isRecord(payload) ? payload : undefined;
}

/**
 * Build an ok IPC response envelope.
 * @param arguments_
 * @param result
 */
export function buildOkResponse(arguments_: unknown, result?: unknown) {
  return {
    requestId: requestIdFromArguments(arguments_) ?? 'req',
    status: 'ok',
    result,
  };
}

/**
 * Build an error IPC response envelope.
 * @param arguments_
 * @param error
 */
export function buildErrorResponse(arguments_: unknown, error: unknown) {
  return {
    requestId: requestIdFromArguments(arguments_) ?? 'req',
    status: 'error',
    error,
  };
}

/**
 * Install Tauri IPC/window mocks for the current test.
 * @param options
 */
export function installTauriMocks(options: TauriMockOptions = {}) {
  const {
    currentWindow = 'main',
    additionalWindows = [],
    ipcHandler,
    enableRuntime = true,
  } = options;

  ipcCalls.length = 0;

  if (enableRuntime) {
    (globalThis as { __TAURI__?: unknown }).__TAURI__ = {};
    if ('window' in globalThis) {
      (globalThis.window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ = {};
    }
  }

  mockWindows(currentWindow, ...additionalWindows);
  mockIPC((command, arguments_) => {
    ipcCalls.push({ command, arguments_: arguments_ as IpcArguments });
    if (command === LOGGING_CONTEXT_COMMAND) {
      return {
        sessionId: 'test-session',
        buildVersion: '0.0.0',
        platformOs: 'vitest',
        platformArch: 'x64',
      };
    }
    if (ipcHandler) {
      return ipcHandler(command, arguments_ as IpcArguments);
    }
    return buildOkResponse(arguments_);
  });
}

/**
 * Return a copy of recorded IPC calls.
 */
export function getIpcCalls(): IpcCall[] {
  return [...ipcCalls];
}

/**
 * Find a recorded IPC call by command name.
 * @param command
 */
export function findIpcCall(command: string): IpcCall | undefined {
  return ipcCalls.find((call) => call.command === command);
}

/**
 * Clear IPC/window mocks and reset runtime globals.
 */
export function clearTauriMocks() {
  clearMocks();
  ipcCalls.length = 0;
  delete (globalThis as { __TAURI__?: unknown }).__TAURI__;
  delete (globalThis as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
  if ('window' in globalThis) {
    delete (globalThis.window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
    delete (globalThis.window as Window & { __TAURI_METADATA__?: unknown }).__TAURI_METADATA__;
  }
  ensureWindowStub();
}
