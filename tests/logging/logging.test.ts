import { describe, expect, it, vi } from 'vitest';

vi.mock('@/adapters/logging-context', () => ({
  getLoggingContext: vi.fn(() =>
    Promise.resolve({
      sessionId: 'session-1',
      buildVersion: '1.0.0',
      buildCommit: 'abc123',
      platformOs: 'linux',
      platformArch: 'x86_64',
    }),
  ),
}));

vi.mock('@tauri-apps/plugin-log', () => ({
  info: vi.fn(),
}));

import { logMessage } from '@/lib/logging';

interface StructuredLogPayload {
  readonly component?: string;
  readonly event_name?: string;
  readonly ['syslog.severity']?: number;
  readonly correlation_id?: string;
  readonly session_id?: string;
  readonly source?: {
    readonly module?: string;
    readonly function?: string;
  };
  readonly user_impact?: string;
}

/**
 * Extract the JSON payload from a structured log line.
 * @param line NDJSON line to inspect.
 */
function parseStructuredLog(line?: string): StructuredLogPayload | undefined {
  if (!line) {
    return undefined;
  }
  const start = line.indexOf('{');
  if (start === -1) {
    return undefined;
  }
  const parsed = JSON.parse(line.slice(start)) as unknown;
  if (typeof parsed === 'object' && parsed !== null) {
    return parsed;
  }
  return undefined;
}

describe('logMessage helper', () => {
  it('writes structured NDJSON with required fields', async () => {
    const plugin = vi.mocked(await import('@tauri-apps/plugin-log'), true);
    plugin.info.mockClear();
    await logMessage({
      severity: 'notice',
      component: 'core',
      eventName: 'app_start',
      message: 'starting',
      correlationId: 'corr-id',
      metadata: { phase: 'ready' },
      source: { module: 'ui', function: 'start' },
    });

    expect(plugin.info).toHaveBeenCalledTimes(1);
    const pluginLine = plugin.info.mock.calls[0]?.[0];
    expect(pluginLine).toBeDefined();
    const payload = parseStructuredLog(pluginLine);
    expect(payload?.component).toBe('core');
    expect(payload?.event_name).toBe('app_start');
    expect(payload?.['syslog.severity']).toBe(5);
    expect(payload?.correlation_id).toBe('corr-id');
    expect(payload?.session_id).toBe('session-1');
    const source = payload?.source;
    expect(source?.module).toBe('ui');
    expect(source?.function).toBe('start');
  });

  it('forwards NDJSON records to the Tauri logging plugin', async () => {
    const plugin = vi.mocked(await import('@tauri-apps/plugin-log'), true);
    plugin.info.mockClear();
    await logMessage({
      severity: 'error',
      component: 'core',
      eventName: 'ui_error',
      message: 'something failed',
      correlationId: 'corr-id',
      metadata: { user_impact: 'blocked' },
    });

    expect(plugin.info).toHaveBeenCalledTimes(1);
    const pluginLine = plugin.info.mock.calls[0]?.[0];
    expect(pluginLine).toBeDefined();
    const payload = parseStructuredLog(pluginLine);
    expect(payload?.event_name).toBe('ui_error');
    expect(payload?.user_impact).toBe('blocked');
  });
});
