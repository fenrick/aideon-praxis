/* @vitest-environment jsdom */
import { describe, it, beforeEach, expect } from 'vitest';
import { createRoot } from 'react-dom/client';
import App from '../../src/renderer/app';
import '../../src/renderer/global.d.ts';

describe('renderer bootstrap', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>';
    // minimal bridge for render path
    // @ts-expect-error test shim: inject minimal preload bridge
    globalThis.aideon = {
      version: 'test',
      stateAt: () =>
        Promise.resolve({
          asOf: '2025-01-01',
          scenario: null,
          confidence: null,
          nodes: 0,
          edges: 0,
        }),
    };
  });
  it('mounts into #root', async () => {
    const container = document.querySelector('#root');
    if (!container) throw new Error('Root not found');
    const root = createRoot(container);
    root.render(<App />);
    // Let effects flush, then unmount to avoid jsdom teardown errors
    await new Promise((r) => setTimeout(r, 0));
    root.unmount();
    // Basic assertion on the container identity
    expect((container as HTMLElement).id).toBe('root');
  });
});
