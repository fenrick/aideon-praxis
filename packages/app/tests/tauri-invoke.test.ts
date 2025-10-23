import { describe, expect, it, vi } from 'vitest';
import { tauriInvoke } from '../src/host/tauri-invoke';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue('ok'),
}));

describe('tauriInvoke wrapper (Tauri assumed available)', () => {
  it('invokes underlying @tauri-apps/api/core.invoke', async () => {
    await expect(tauriInvoke<string>('my:cmd', { a: 1 })).resolves.toBe('ok');
  });
});
