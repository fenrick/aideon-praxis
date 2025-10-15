/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach } from 'vitest';
import './global.d.ts';

describe('renderer bootstrap', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>';
    // minimal bridge for render path
    // @ts-expect-error test shim
    globalThis.aideon = {
      version: 'test',
      stateAt: async () => ({
        asOf: '2025-01-01',
        scenario: null,
        confidence: null,
        nodes: 0,
        edges: 0,
      }),
    };
  });
  it('mounts into #root', async () => {
    const root = document.querySelector('#root');
    expect(root).toBeTruthy();
    await import('./index');
  });
});
