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

describe('logMessage helper', () => {
  it('writes structured NDJSON with required fields', async () => {
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
    const callArg = spy.mock.calls[0][0] as string;
    const payload = JSON.parse(callArg.split(' ', 2)[1]);
    expect(payload.component).toBe('core');
    expect(payload.event_name).toBe('app_start');
    expect(payload['syslog.severity']).toBe(5);
    expect(payload.correlation_id).toBe('corr-id');
    expect(payload.session_id).toBe('session-1');
    expect(payload.source.module).toBe('ui');
    expect(payload.source.function).toBe('start');

    spy.mockRestore();
  });
});
