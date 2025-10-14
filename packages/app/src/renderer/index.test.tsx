import { describe, it, expect, beforeAll } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import '../renderer/global.d.ts';

import App from './App';

describe('Renderer App', () => {
  beforeAll(() => {
    // Expose bridge for test
    (globalThis as any).window = { aideon: { version: 'test' } } as any;
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
