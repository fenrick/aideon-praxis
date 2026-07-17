import { getLoggingContext } from '@/adapters/logging-context';

export type Severity =
  | 'emergency'
  | 'alert'
  | 'critical'
  | 'error'
  | 'warning'
  | 'notice'
  | 'info'
  | 'informational'
  | 'debug';

type NormalizedSeverity =
  'emergency' | 'alert' | 'critical' | 'error' | 'warning' | 'notice' | 'informational' | 'debug';

interface SeverityAttributes {
  readonly level: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
  readonly severityNumber: number;
  readonly severityText: string;
  readonly consoleMethod: 'error' | 'warn' | 'info' | 'debug';
}

/** @public */
export interface LogSource {
  readonly module?: string;
  readonly function?: string;
}

export interface LogEntry {
  readonly severity: Severity;
  readonly component: string;
  readonly eventName: string;
  readonly message: string;
  readonly correlationId?: string;
  readonly source?: LogSource;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Normalize `info` severity so the downstream sinks receive a stable set of labels.
 * @param severity severity value from the caller.
 */
function normalizeSeverity(severity: Severity): NormalizedSeverity {
  return severity === 'info' ? 'informational' : severity;
}

/**
 * Attributes for every normalized severity level, keyed by label.
 *
 * The `Record<NormalizedSeverity, ...>` type makes the compiler require an
 * entry for every severity, so the mapping stays exhaustive.
 */
const severityAttributesByLevel: Record<NormalizedSeverity, SeverityAttributes> = {
  emergency: {
    level: 'ERROR',
    severityNumber: 0,
    severityText: 'Emergency',
    consoleMethod: 'error',
  },
  alert: { level: 'ERROR', severityNumber: 1, severityText: 'Alert', consoleMethod: 'error' },
  critical: { level: 'ERROR', severityNumber: 2, severityText: 'Critical', consoleMethod: 'error' },
  error: { level: 'ERROR', severityNumber: 3, severityText: 'Error', consoleMethod: 'error' },
  warning: { level: 'WARN', severityNumber: 4, severityText: 'Warning', consoleMethod: 'warn' },
  notice: { level: 'INFO', severityNumber: 5, severityText: 'Notice', consoleMethod: 'info' },
  informational: {
    level: 'INFO',
    severityNumber: 6,
    severityText: 'Informational',
    consoleMethod: 'info',
  },
  debug: { level: 'DEBUG', severityNumber: 7, severityText: 'Debug', consoleMethod: 'debug' },
};

/**
 * Lookup derived from {@link severityAttributesByLevel} so callers can resolve
 * attributes by a runtime severity value without an object index expression.
 */
const severityAttributesLookup = new Map(Object.entries(severityAttributesByLevel));

/**
 * Describe the attributes that every severity level maps to.
 * @param severity normalized severity label.
 * @returns characteristics for the requested level.
 */
function describeSeverity(severity: NormalizedSeverity): SeverityAttributes {
  const attributes = severityAttributesLookup.get(severity);
  if (attributes === undefined) {
    throw new Error('Unhandled severity level');
  }
  return attributes;
}

/**
 * Helper that throws when the compiler believes an exhaustive switch is not completed.
 * @param _value value that should never be reachable.
 */
function assertNever(_value: never): never {
  throw new Error('Unhandled severity level');
}

/**
 * Forward a structured JSON line to the Tauri logging plugin when available.
 * @param line serialized log line to ship.
 */
async function forwardToTauri(line: string): Promise<void> {
  try {
    const log = await import('@tauri-apps/plugin-log');
    await log.info(line);
  } catch {
    // ignore missing plugin
  }
}

/**
 * Emit a structured log entry to both console and the Tauri plugin.
 * @param entry log payload provided by callers.
 */
export async function logMessage(entry: LogEntry): Promise<void> {
  const context = await getLoggingContext();
  const severity = normalizeSeverity(entry.severity);
  const severityAttributes = describeSeverity(severity);

  const record = {
    timestamp: new Date().toISOString(),
    level: severityAttributes.level,
    'syslog.severity': severityAttributes.severityNumber,
    'syslog.severity_text': severityAttributes.severityText,
    message: entry.message,
    component: entry.component,
    event_name: entry.eventName,
    correlation_id: entry.correlationId ?? 'unknown',
    session_id: context.sessionId,
    build: {
      version: context.buildVersion,
      commit: context.buildCommit ?? 'unknown',
    },
    platform: {
      os: context.platformOs,
      arch: context.platformArch,
    },
    source: {
      layer: 'webview',
      module: entry.source?.module ?? 'unknown',
      function: entry.source?.function ?? 'unknown',
    },
    ...entry.metadata,
  };

  const line = JSON.stringify(record);
  const consoleReference = (globalThis as typeof globalThis & { console: Console }).console;
  const formattedLine = `[${severity}] ${line}`;
  switch (severityAttributes.consoleMethod) {
    case 'error': {
      consoleReference.error(formattedLine);
      break;
    }
    case 'warn': {
      consoleReference.warn(formattedLine);
      break;
    }
    case 'info': {
      consoleReference.info(formattedLine);
      break;
    }
    case 'debug': {
      consoleReference.debug(formattedLine);
      break;
    }
    default: {
      assertNever(severityAttributes.consoleMethod);
    }
  }
  await forwardToTauri(line);
}
