import { describe, expect, it, vi } from 'vitest';

let lastMessage = '';
vi.mock('@tauri-apps/plugin-log', () => ({
  debug: (m: string) => {
    lastMessage = m;
    return Promise.resolve();
  },
  error: (_: string) => Promise.resolve(),
  info: (_: string) => Promise.resolve(),
}));

describe('logSafely callsite enrichment', () => {
  it('prefixes message with original callsite when available', async () => {
    const logging = await import('../src/lib/logging');
    await logging.debug('bootstrap');
    logging.logSafely(logging.debug, 'hello');
    const msg = lastMessage;
    // Should include a [file:line:col] origin prefix
    expect(/\[[^\]]+:\d+:\d+\] /.test(msg)).toBe(true);
    expect(msg.endsWith('hello')).toBe(true);
  });
});
