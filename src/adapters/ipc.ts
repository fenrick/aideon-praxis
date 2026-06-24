import { logMessage } from '@/lib/logging';
import { invoke } from '@tauri-apps/api/core';

export interface IpcRequest<Payload> {
  readonly requestId: string;
  readonly payload: Payload;
}

/** RFC-9457 Problem Detail carried over IPC (ADR-0016, error-envelope.md). */
export interface IpcError {
  readonly type: string;
  readonly code: string;
  readonly title: string;
  readonly detail: string;
  readonly category: 'validation' | 'permission' | 'conflict' | 'transient' | 'internal';
  readonly recovery: 'retry' | 'reconcile' | 'refresh' | 'none' | 'report';
  readonly correlationId: string;
  readonly details: unknown;
}

export interface IpcResponse<Result> {
  readonly requestId: string;
  readonly status: 'ok' | 'error';
  readonly result?: Result;
  readonly error?: IpcError;
}

export class HostIpcError extends Error {
  public readonly code: string;
  public readonly details: unknown;

  /**
   * @param code - Stable machine-readable code.
   * @param message - Human-readable message.
   * @param details - Arbitrary error detail payload.
   */
  public constructor(code: string, message: string, details: unknown) {
    super(message);
    this.name = 'HostIpcError';
    this.code = code;
    this.details = details;
  }
}

let requestIdCounter = 0;

/** Generate a request ID suitable for correlating IPC responses. */
function nextRequestId(): string {
  requestIdCounter += 1;
  return `${crypto.randomUUID()}-${requestIdCounter.toString(36)}`;
}

interface InvokeOptions {
  readonly log?: boolean;
}

/**
 * Build metadata for instrumentation entries.
 * @param command
 * @param requestId
 * @param additional
 */
function buildMetadata(
  command: string,
  requestId: string,
  additional?: Record<string, unknown>,
): Record<string, unknown> {
  return {
    command,
    request_id: requestId,
    ...additional,
  };
}

/**
 * Emit an instrumentation log entry if logging is enabled.
 * @param error
 */
/**
 * Ignores log failures to prevent instrumentation noise from crashing commands.
 * @param _error - Ignored instrumentation error.
 */
function ignoreLogError(_error: unknown): void {
  // intentionally ignore instrumentation failures
}

/**
 *
 * @param log
 * @param logEntry
 */
function emitLog(log: boolean, logEntry: Parameters<typeof logMessage>[0]): void {
  if (!log) {
    return;
  }
  logMessage(logEntry).catch(ignoreLogError);
}

const IPC_SOURCE = { module: 'ipc', function: 'invokeIpc' } as const;

/**
 *
 * @param command
 * @param requestId
 * @param shouldLog
 * @param metadata
 * @param throwMessage
 * @param details
 */
function logInvalidResponse(
  command: string,
  requestId: string,
  shouldLog: boolean,
  metadata: Record<string, unknown>,
  throwMessage: string,
  details?: unknown,
): never {
  emitLog(shouldLog, {
    severity: 'error',
    component: 'ui',
    eventName: 'command_failed',
    message: 'Command returned invalid response',
    correlationId: requestId,
    metadata: buildMetadata(command, requestId, metadata),
    source: IPC_SOURCE,
  });
  throw new HostIpcError('invalid_response', throwMessage, details ?? {});
}

/**
 *
 * @param response
 * @param command
 * @param requestId
 * @param shouldLog
 */
function ensureValidResponseRecord(
  response: unknown,
  command: string,
  requestId: string,
  shouldLog: boolean,
): Record<string, unknown> {
  if (typeof response !== 'object' || response === null) {
    return logInvalidResponse(
      command,
      requestId,
      shouldLog,
      { error_kind: 'invalid_response' },
      'Host returned invalid response.',
      response,
    );
  }

  const record = response as Record<string, unknown>;
  const responseRequestId = record.requestId;
  if (typeof responseRequestId !== 'string') {
    return logInvalidResponse(
      command,
      requestId,
      shouldLog,
      { error_kind: 'invalid_response' },
      'Host returned invalid response.',
      record,
    );
  }

  if (responseRequestId !== requestId) {
    return logInvalidResponse(
      command,
      requestId,
      shouldLog,
      { error_kind: 'mismatched_request_id' },
      'Host returned mismatched requestId.',
      { expected: requestId, got: responseRequestId },
    );
  }

  return record;
}

/**
 *
 * @param record
 * @param command
 * @param requestId
 * @param shouldLog
 */
function resolveResultFromRecord(
  record: Record<string, unknown>,
  command: string,
  requestId: string,
  shouldLog: boolean,
): unknown {
  const status = record.status;
  if (status === 'ok') {
    emitLog(shouldLog, {
      severity: 'notice',
      component: 'ui',
      eventName: 'command_completed',
      message: 'Command completed',
      correlationId: requestId,
      metadata: buildMetadata(command, requestId, { status }),
      source: IPC_SOURCE,
    });
    return record.result;
  }

  if (status !== 'error') {
    return logInvalidResponse(
      command,
      requestId,
      shouldLog,
      { error_kind: 'invalid_response' },
      'Host returned invalid response.',
      record,
    );
  }

  const error = record.error as Partial<IpcError> | undefined;
  const code = typeof error?.code === 'string' ? error.code : 'UNKNOWN_ERROR';
  // RFC-9457 Problem Detail: the human explanation is `detail`.
  const message =
    typeof error?.detail === 'string' ? error.detail : 'Host reported an unknown error.';
  const details = error?.details ?? {};
  emitLog(shouldLog, {
    severity: 'error',
    component: 'ui',
    eventName: 'command_failed',
    message: 'Command failed',
    correlationId: requestId,
    metadata: buildMetadata(command, requestId, {
      error_kind: code,
      error_message: message,
    }),
    source: IPC_SOURCE,
  });
  throw new HostIpcError(code, message, details);
}

/**
 * Invoke a host IPC command using the request/response envelope contract.
 * @param command - Namespaced command string.
 * @param payload - Command payload object.
 * @param options - Instrumentation controls.
 */
export async function invokeIpc<Result>(
  command: string,
  payload: Record<string, unknown>,
  options?: InvokeOptions,
): Promise<Result> {
  const requestId = nextRequestId();
  const shouldLog = options?.log ?? true;
  emitLog(shouldLog, {
    severity: 'notice',
    component: 'ui',
    eventName: 'command_invoked',
    message: `Invoking ${command}`,
    correlationId: requestId,
    metadata: buildMetadata(command, requestId),
    source: { module: 'ipc', function: 'invokeIpc' },
  });

  let response: unknown;
  try {
    response = await invoke(command, {
      request: { requestId, payload } satisfies IpcRequest<Record<string, unknown>>,
    });
  } catch (error) {
    emitLog(shouldLog, {
      severity: 'error',
      component: 'ui',
      eventName: 'command_failed',
      message: `Command invocation failed`,
      correlationId: requestId,
      metadata: buildMetadata(command, requestId, {
        error_message: error instanceof Error ? error.message : String(error),
      }),
      source: IPC_SOURCE,
    });
    throw error;
  }

  const record = ensureValidResponseRecord(response, command, requestId, shouldLog);
  return resolveResultFromRecord(record, command, requestId, shouldLog) as Result;
}
