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

function parseStructuredLog(line?: string) {
  if (!line) {
    return null;
  }
  const start = line.indexOf('{');
  if (start === -1) {
    return null;
  }
  return JSON.parse(line.slice(start));
}

describe('logMessage helper', () => {
  it('writes structured NDJSON with required fields', async () => {
    const plugin = await import('@tauri-apps/plugin-log');
    plugin.info.mockClear();
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    await logMessage({
      severity: 'notice',
      component: 'core',
      eventName: 'app_start',
      message: 'starting',
      correlationId: 'corr-id',
      metadata: { phase: 'ready' },
      source: { module: 'ui', function: 'start' },
    });

    expect(spy).toHaveBeenCalledTimes(1);
    const callArg = spy.mock.calls[0]?.[0];
    expect(callArg).toBeDefined();
    const payload = parseStructuredLog(callArg as string);
    expect(payload?.component).toBe('core');
    expect(payload?.event_name).toBe('app_start');
    expect(payload?.['syslog.severity']).toBe(5);
    expect(payload?.correlation_id).toBe('corr-id');
    expect(payload?.session_id).toBe('session-1');
    expect(payload?.source.module).toBe('ui');
    expect(payload?.source.function).toBe('start');

    spy.mockRestore();
  });

  it('forwards NDJSON records to the Tauri logging plugin', async () => {
    const plugin = await import('@tauri-apps/plugin-log');
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
    const pluginArg = plugin.info.mock.calls[0]?.[0];
    const payload = parseStructuredLog(pluginArg as string);
    expect(payload?.event_name).toBe('ui_error');
    expect(payload?.user_impact).toBe('blocked');
  });
});
