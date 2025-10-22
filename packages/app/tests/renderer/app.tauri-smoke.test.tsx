import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '../../src/renderer/tauri-shim';
import App from '../../src/renderer/app';

describe('App renderer ↔ Tauri host invoke smoke', () => {
  const originalTauri = (globalThis as any).__TAURI__;

  beforeEach(() => {
    delete (globalThis as any).__TAURI__;
  });

  afterEach(() => {
    (globalThis as any).__TAURI__ = originalTauri;
    vi.restoreAllMocks();
  });

  it('shows an error when Tauri is not available', async () => {
    render(<App />);
    await waitFor(() => screen.getByText(/Bridge version:/));
    await waitFor(() => screen.getByText(/Error:/));
    expect(screen.getByText(/Error:/).textContent).toMatch(
      /Tauri runtime not available|Bridge not available/,
    );
  });

  it('renders worker state payload when Tauri is available', async () => {
    const payload = {
      asOf: '2025-01-01',
      scenario: null,
      confidence: null,
      nodes: 1,
      edges: 2,
    };
    (globalThis as any).__TAURI__ = { invoke: vi.fn().mockResolvedValue(payload) };

    render(<App />);
    // Should eventually show the JSON payload (React StrictMode may double-render in tests)
    await waitFor(() => screen.getAllByText(/Worker Connectivity/));
    await waitFor(() => screen.getAllByText(/"nodes": 1/));
    expect(screen.getAllByText(/"edges": 2/).length).toBeGreaterThan(0);
  });
});
/* @vitest-environment jsdom */
