/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../../src/renderer/app';

interface WorkerState {
  asOf: string;
  scenario: string | null;
  confidence: number | null;
  nodes: number;
  edges: number;
}
declare global {
  interface Window {
    aideon: { version: string; stateAt: (arguments_: { asOf: string }) => Promise<WorkerState> };
  }
}

describe('App component', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>';
  });

  it('renders success path and shows worker JSON', async () => {
    globalThis.aideon = {
      version: 'test',
      stateAt: () =>
        Promise.resolve({
          asOf: '2025-01-01',
          scenario: null,
          confidence: null,
          nodes: 1,
          edges: 2,
        }),
    };
    render(<App />);
    await waitFor(() => screen.getByText('Worker Connectivity'));
    expect(Boolean(screen.getByText('Aideon Praxis'))).toBe(true);
    expect(Boolean(screen.getByText(/Renderer booted. Bridge version/))).toBe(true);
  });

  it('renders error path when stateAt throws', async () => {
    globalThis.aideon = {
      version: 'test',
      stateAt: () => Promise.reject(new Error('boom')),
    };
    render(<App />);
    await waitFor(() => screen.getByText('Worker Connectivity'));
    expect(Boolean(screen.getByText(/Error:/))).toBe(true);
  });
});
