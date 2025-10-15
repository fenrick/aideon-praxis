/* @vitest-environment node */
import { describe, it, expect, vi, beforeAll } from 'vitest';

const { getExposed, setExposed } = vi.hoisted(() => {
  let exposed: any = null;
  return {
    getExposed: () => exposed,
    setExposed: (v: any) => {
      exposed = v;
    },
  };
});
vi.mock('electron', () => ({
  contextBridge: {
    exposeInMainWorld: vi.fn((key: string, value: any) => {
      if (key === 'aideon') setExposed(value);
    }),
  },
  ipcRenderer: {
    invoke: vi.fn(async () => ({
      asOf: '2025-01-01',
      scenario: null,
      confidence: null,
      nodes: 0,
      edges: 0,
    })),
  },
}));

// eslint-disable-next-line import/first
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
