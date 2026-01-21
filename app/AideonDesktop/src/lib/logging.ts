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
  | 'emergency'
  | 'alert'
  | 'critical'
  | 'error'
  | 'warning'
  | 'notice'
  | 'informational'
  | 'debug';

const severityToNumber: Record<NormalizedSeverity, number> = {
  emergency: 0,
  alert: 1,
  critical: 2,
  error: 3,
  warning: 4,
  notice: 5,
  informational: 6,
  debug: 7,
};

const severityText: Record<NormalizedSeverity, string> = {
  emergency: 'Emergency',
  alert: 'Alert',
  critical: 'Critical',
  error: 'Error',
  warning: 'Warning',
  notice: 'Notice',
  informational: 'Informational',
  debug: 'Debug',
};

const severityToLevel: Record<NormalizedSeverity, 'ERROR' | 'WARN' | 'INFO' | 'DEBUG'> = {
  emergency: 'ERROR',
  alert: 'ERROR',
  critical: 'ERROR',
  error: 'ERROR',
  warning: 'WARN',
  notice: 'INFO',
  informational: 'INFO',
  debug: 'DEBUG',
};

const consoleMethod: Record<NormalizedSeverity, keyof Console> = {
  emergency: 'error',
  alert: 'error',
  critical: 'error',
  error: 'error',
  warning: 'warn',
  notice: 'info',
  informational: 'info',
  debug: 'debug',
};

function normalizeSeverity(severity: Severity): NormalizedSeverity {
  return severity === 'info' ? 'informational' : severity;
}

type Source = {
  readonly module?: string;
  readonly function?: string;
};

export interface LogEntry {
  readonly severity: Severity;
  readonly component: string;
  readonly eventName: string;
  readonly message: string;
  readonly correlationId?: string;
  readonly source?: Source;
  readonly metadata?: Record<string, unknown>;
}

async function forwardToTauri(line: string): Promise<void> {
  try {
    const log = await import('@tauri-apps/plugin-log');
    await log.info(line);
  } catch {
    // ignore missing plugin
  }
}

export async function logMessage(entry: LogEntry): Promise<void> {
  const context = await getLoggingContext();
  const severity = normalizeSeverity(entry.severity);
  const record = {
    timestamp: new Date().toISOString(),
    level: severityToLevel[severity],
    'syslog.severity': severityToNumber[severity],
    'syslog.severity_text': severityText[severity],
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
  const method = consoleMethod[severity] ?? 'log';
  const logger = console[method] ?? console.log;
  logger.call(console, `[${severity}] ${line}`);
  await forwardToTauri(line);
}
