import { afterEach, describe, expect, it } from 'vitest';

import { isTauri } from 'praxis/platform';
import { clearTauriMocks, installTauriMocks } from '../tauri-mocks';

describe('praxis/platform', () => {
  afterEach(() => {
    clearTauriMocks();
  });

  it('detects tauri internals when present', () => {
    expect(isTauri()).toBe(false);

    installTauriMocks();
    expect(isTauri()).toBe(true);
  });
});
