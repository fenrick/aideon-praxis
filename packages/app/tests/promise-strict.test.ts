/* @vitest-environment node */
import { describe, it, expect } from 'vitest';

describe('unhandled promise rejections', () => {
  it('installs a handler so they fail tests', () => {
    const listeners = process.listeners('unhandledRejection');
    expect(listeners.length).toBeGreaterThan(0);
  });
});
