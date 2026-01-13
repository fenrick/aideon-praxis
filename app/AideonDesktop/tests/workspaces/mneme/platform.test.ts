import { afterEach, describe, expect, it } from 'vitest';

import { isTauri } from '@/workspaces/mneme/platform';
import { clearTauriMocks, installTauriMocks } from '../../tauri-mocks';

afterEach(() => {
  clearTauriMocks();
});

describe('mneme platform', () => {
  it('returns false when no tauri flags are present', () => {
    expect(isTauri()).toBe(false);
  });

  it('detects tauri internals and metadata flags', () => {
    installTauriMocks();
    expect(isTauri()).toBe(true);

    clearTauriMocks();
    const tauriWindow = globalThis as unknown as Window & { __TAURI_METADATA__?: unknown };
    tauriWindow.__TAURI_METADATA__ = {};
    expect(isTauri()).toBe(true);
  });
});
