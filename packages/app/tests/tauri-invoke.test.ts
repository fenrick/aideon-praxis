import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { __test__, tauriInvoke, TauriNotAvailableError } from '../src/host/tauri-invoke';

describe('tauriInvoke wrapper', () => {
  const orig = (globalThis as any).__TAURI__;

  beforeEach(() => {
    delete (globalThis as any).__TAURI__;
  });

  afterEach(() => {
    (globalThis as any).__TAURI__ = orig;
  });

  it('detects absence of Tauri', () => {
    expect(__test__.hasTauri()).toBe(false);
  });

  it('throws when Tauri is not present', async () => {
    await expect(tauriInvoke('noop')).rejects.toBeInstanceOf(TauriNotAvailableError);
  });

  it('invokes when Tauri is present', async () => {
    const invoke = vi.fn().mockResolvedValue('ok');
    (globalThis as any).__TAURI__ = { invoke };
    await expect(tauriInvoke<string>('my:cmd', { a: 1 })).resolves.toBe('ok');
    expect(invoke).toHaveBeenCalledWith('my:cmd', { a: 1 });
  });
});
