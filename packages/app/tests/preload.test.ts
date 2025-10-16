/* @vitest-environment node */
import { describe, it, expect, vi, beforeAll } from 'vitest';
type WorkerState = {
  asOf: string;
  scenario: string | null;
  confidence: number | null;
  nodes: number;
  edges: number;
};

const { getExposed, setExposed } = vi.hoisted(() => {
  let exposed: { version: string; stateAt: (a: { asOf: string }) => Promise<WorkerState> } | null = null;
  return {
    getExposed: () => exposed,
    setExposed: (v: { version: string; stateAt: (a: { asOf: string }) => Promise<WorkerState> }) => {
      exposed = v;
    },
  };
});
vi.mock('electron', () => ({
  contextBridge: {
    exposeInMainWorld: vi.fn((key: string, value: { version: string; stateAt: (a: { asOf: string }) => Promise<WorkerState> }) => {
      if (key === 'aideon') setExposed(value);
    }),
  },
  ipcRenderer: {
    invoke: vi.fn(() => Promise.resolve({
      asOf: '2025-01-01',
      scenario: null,
      confidence: null,
      nodes: 0,
      edges: 0,
    })),
  },
}));

import './preload';

describe('preload bridge', () => {
  beforeAll(() => {
    expect(getExposed()).toBeTruthy();
  });

  it('exposes version and stateAt()', async () => {
    const api = getExposed();
    expect(typeof api.version).toBe('string');
    const res = await api.stateAt({ asOf: '2025-01-01' });
    expect(res).toMatchObject({ nodes: 0, edges: 0 });
  });
});
