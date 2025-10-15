/* @vitest-environment jsdom */
import { describe, it, expect } from 'vitest';

describe('renderer bootstrap without root', () => {
  it('throws when #root is missing', async () => {
    await expect(import('./index')).rejects.toBeTruthy();
  });
});

