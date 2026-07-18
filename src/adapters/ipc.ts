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

/** Correlated context threaded through a single IPC round-trip. */
interface IpcContext {
  readonly command: string;
  readonly requestId: string;
  readonly shouldLog: boolean;
}

const IPC_SOURCE = { module: 'ipc', function: 'invokeIpc' } as const;

/**
 * Build metadata for instrumentation entries.
 * @param context - Correlated IPC context.
 * @param additional - Extra metadata fields to merge in.
 */
function buildMetadata(
  context: IpcContext,
  additional?: Record<string, unknown>,
): Record<string, unknown> {
  return {
    command: context.command,
    request_id: context.requestId,
    ...additional,
  };
}

/**
 * Ignores log failures to prevent instrumentation noise from crashing commands.
 * @param _error - Ignored instrumentation error.
 */
function ignoreLogError(_error: unknown): void {
  // intentionally ignore instrumentation failures
}

/**
 * Emit an instrumentation log entry if logging is enabled.
 * @param log - Whether logging is enabled.
 * @param logEntry - The structured log entry to emit.
 */
function emitLog(log: boolean, logEntry: Parameters<typeof logMessage>[0]): void {
  if (!log) {
    return;
  }
  logMessage(logEntry).catch(ignoreLogError);
}

/**
 * Log an invalid-response failure and throw a HostIpcError.
 * @param context - Correlated IPC context.
 * @param metadata - Extra metadata describing the failure.
 * @param throwMessage - Human-readable message for the thrown error.
 * @param details - Arbitrary error detail payload.
 */
function logInvalidResponse(
  context: IpcContext,
  metadata: Record<string, unknown>,
  throwMessage: string,
  details?: unknown,
): never {
  emitLog(context.shouldLog, {
    severity: 'error',
    component: 'ui',
    eventName: 'command_failed',
    message: 'Command returned invalid response',
    correlationId: context.requestId,
    metadata: buildMetadata(context, metadata),
    source: IPC_SOURCE,
  });
  throw new HostIpcError('invalid_response', throwMessage, details ?? {});
}

/**
 * Validate the response envelope shape and correlate its requestId.
 * @param response - Raw value returned by the host.
 * @param context - Correlated IPC context.
 */
function ensureValidResponseRecord(
  response: unknown,
  context: IpcContext,
): Record<string, unknown> {
  if (typeof response !== 'object' || response === null) {
    return logInvalidResponse(
      context,
      { error_kind: 'invalid_response' },
      'Host returned invalid response.',
      response,
    );
  }

  const record = response as Record<string, unknown>;
  const responseRequestId = record.requestId;
  if (typeof responseRequestId !== 'string') {
    return logInvalidResponse(
      context,
      { error_kind: 'invalid_response' },
      'Host returned invalid response.',
      record,
    );
  }

  if (responseRequestId !== context.requestId) {
    return logInvalidResponse(
      context,
      { error_kind: 'mismatched_request_id' },
      'Host returned mismatched requestId.',
      { expected: context.requestId, got: responseRequestId },
    );
  }

  return record;
}

/**
 * Log a successful command and return its result payload.
 * @param record - Validated response record.
 * @param context - Correlated IPC context.
 */
function resolveOkResult(record: Record<string, unknown>, context: IpcContext): unknown {
  emitLog(context.shouldLog, {
    // DEBUG: routine per-command chatter mirrored from the host. Failures below
    // stay ERROR. Raise the log filter to trace individual calls.
    severity: 'debug',
    component: 'ui',
    eventName: 'command_completed',
    message: 'Command completed',
    correlationId: context.requestId,
    metadata: buildMetadata(context, { status: 'ok' }),
    source: IPC_SOURCE,
  });
  return record.result;
}

/**
 * Log a reported command error and throw the corresponding HostIpcError.
 * @param record - Validated response record.
 * @param context - Correlated IPC context.
 */
function throwReportedError(record: Record<string, unknown>, context: IpcContext): never {
  const error = record.error as Partial<IpcError> | undefined;
  const code = typeof error?.code === 'string' ? error.code : 'UNKNOWN_ERROR';
  // RFC-9457 Problem Detail: the human explanation is `detail`.
  const message =
    typeof error?.detail === 'string' ? error.detail : 'Host reported an unknown error.';
  const details = error?.details ?? {};
  emitLog(context.shouldLog, {
    severity: 'error',
    component: 'ui',
    eventName: 'command_failed',
    message: 'Command failed',
    correlationId: context.requestId,
    metadata: buildMetadata(context, {
      error_kind: code,
      error_message: message,
    }),
    source: IPC_SOURCE,
  });
  throw new HostIpcError(code, message, details);
}

/**
 * Resolve the result payload from a validated response record.
 * @param record - Validated response record.
 * @param context - Correlated IPC context.
 */
function resolveResultFromRecord(record: Record<string, unknown>, context: IpcContext): unknown {
  const status = record.status;
  if (status === 'ok') {
    return resolveOkResult(record, context);
  }
  if (status === 'error') {
    return throwReportedError(record, context);
  }
  return logInvalidResponse(
    context,
    { error_kind: 'invalid_response' },
    'Host returned invalid response.',
    record,
  );
}

/**
 * Invoke the host command and return its raw response envelope.
 * @param payload - Command payload object.
 * @param context - Correlated IPC context.
 */
async function dispatchInvoke(
  payload: Record<string, unknown>,
  context: IpcContext,
): Promise<unknown> {
  try {
    return await invoke(context.command, {
      request: { requestId: context.requestId, payload } satisfies IpcRequest<
        Record<string, unknown>
      >,
    });
  } catch (error) {
    emitLog(context.shouldLog, {
      severity: 'error',
      component: 'ui',
      eventName: 'command_failed',
      message: `Command invocation failed`,
      correlationId: context.requestId,
      metadata: buildMetadata(context, {
        error_message: error instanceof Error ? error.message : String(error),
      }),
      source: IPC_SOURCE,
    });
    throw error;
  }
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
  const context: IpcContext = {
    command,
    requestId: nextRequestId(),
    shouldLog: options?.log ?? true,
  };
  emitLog(context.shouldLog, {
    severity: 'debug',
    component: 'ui',
    eventName: 'command_invoked',
    message: `Invoking ${command}`,
    correlationId: context.requestId,
    metadata: buildMetadata(context),
    source: IPC_SOURCE,
  });

  const response = await dispatchInvoke(payload, context);
  const record = ensureValidResponseRecord(response, context);
  return resolveResultFromRecord(record, context) as Result;
}
