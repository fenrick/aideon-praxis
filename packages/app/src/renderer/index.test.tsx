import { describe, it, expect, beforeAll } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import '../renderer/global.d.ts';

import App from './app';

describe('Renderer App', () => {
  beforeAll(() => {
    // Expose bridge for test
    // Global bridge stub for tests
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
    const div = document.createElement('div');
    div.id = 'root';
    document.body.append(div);
  });

  it('renders without crashing and shows version', () => {
    const html = renderToString(React.createElement(App));
    expect(html).toContain('Aideon Praxis');
  });
});
/* @vitest-environment jsdom */
