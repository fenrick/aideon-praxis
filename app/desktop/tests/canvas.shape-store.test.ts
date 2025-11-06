import { beforeEach, describe, expect, it, vi } from 'vitest';

const tauriInvokeMock = vi.fn();

vi.mock('../src/lib/canvas/layout/elk', () => ({
  layoutShapesWithElk: vi.fn(async (items: unknown) => items),
}));

vi.mock('../src/lib/tauri-invoke', () => ({
  tauriInvoke: tauriInvokeMock,
}));

async function loadStore() {
  return import('../src/lib/canvas/shape-store');
}

describe('canvas shape-store', () => {
  beforeEach(() => {
    vi.resetModules();
    tauriInvokeMock.mockReset();
  });

  it('reloadScene populates shapes from host payload', async () => {
    const store = await loadStore();
    store.setShapes([]);
    tauriInvokeMock.mockResolvedValue([
      { id: 'n1', typeId: 'rect', x: 10, y: 20, w: 100, h: 80 },
      { id: 'n2', typeId: 'rect', x: 40, y: 60, w: 120, h: 90 },
    ]);

    await store.reloadScene('2024-01-01');

    const shapes = store.getShapes();
    expect(shapes).toHaveLength(2);
    expect(shapes.map((s) => s.id)).toEqual(['n1', 'n2']);
  });

  it('reloadScene leaves shapes untouched when host errors', async () => {
    const store = await loadStore();
    const existing = { id: 'existing', typeId: 'rect', x: 0, y: 0, w: 50, h: 50 };
    store.setShapes([existing]);
    tauriInvokeMock.mockRejectedValue(new Error('network down'));

    await store.reloadScene('2024-01-02');

    const shapes = store.getShapes();
    expect(shapes).toHaveLength(1);
    expect(shapes[0]).toMatchObject(existing);
  });
});
