import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Tauri core invoke so shape-store can call into a stubbed host.
const invokeMock = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (cmd: string, args?: Record<string, unknown>) => invokeMock(cmd, args),
}));

// Reset state between tests
beforeEach(() => {
  invokeMock.mockReset();
});

describe('canvas shape-store', () => {
  it('runs ELK when host positions are missing and respects when provided', async () => {
    // First return no positions so auto-layout runs
    invokeMock.mockResolvedValueOnce([
      { id: 'n1', typeId: 'rect', w: 120, h: 80 },
      { id: 'n2', typeId: 'rect', w: 200, h: 120 },
    ]);

    const store = await import('../src/lib/canvas/shape-store');
    store.initDefaultShapes();
    // Wait until shapes are populated (ELK can take a few hundred ms)
    for (let i = 0; i < 40 && store.getShapes().length === 0; i++) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 25));
    }
    const afterInit = store.getShapes();
    expect(afterInit.length).toBeGreaterThan(0);
    // Positions should be assigned by ELK
    expect(afterInit[0].x).not.toBeUndefined();

    // Next: host returns positions; reloadScene should respect them
    invokeMock.mockResolvedValueOnce([{ id: 'a', typeId: 'rect', x: 50, y: 70, w: 100, h: 50 }]);
    await store.reloadScene('2025-01-01');
    const afterReload = store.getShapes();
    expect(afterReload[0].x).toBe(50);
    expect(afterReload[0].y).toBe(70);
  });

  it('relayout updates positions and saveLayout invokes host', async () => {
    // Seed with simple scene
    invokeMock.mockResolvedValueOnce([
      { id: 'x1', typeId: 'rect', w: 100, h: 50 },
      { id: 'x2', typeId: 'rect', w: 100, h: 50 },
    ]);
    const store = await import('../src/lib/canvas/shape-store');
    store.initDefaultShapes();
    await new Promise((r) => setTimeout(r, 10));
    const before = store.getShapes().map((s: any) => ({ x: s.x, y: s.y }));

    await store.relayout({ algorithm: 'org.eclipse.elk.rectpacking', spacing: 24 });
    const after = store.getShapes().map((s: any) => ({ x: s.x, y: s.y }));
    // Positions may match for trivial cases but should be numbers
    expect(Number.isFinite(after[0].x)).toBe(true);
    expect(Number.isFinite(after[0].y)).toBe(true);

    // Save layout should invoke host with payload wrapper
    invokeMock.mockResolvedValueOnce(undefined);
    await store.saveLayout('2025-01-02');
    expect(invokeMock).toHaveBeenLastCalledWith('canvas_save_layout', expect.any(Object));
  });

  it('selection/grid utilities and bounds emit expected state', async () => {
    const store = await import('../src/lib/canvas/shape-store');
    const calls: number[] = [];
    const off = store.subscribe(() => calls.push(1));
    store.setShapes([
      { id: 'a', typeId: 'rect', x: 0, y: 0, w: 10, h: 10 },
      { id: 'b', typeId: 'rect', x: 30, y: 0, w: 10, h: 10 },
    ]);
    store.selectOnly('a');
    expect(store.getSelection().has('a')).toBe(true);
    store.toggleSelect('b');
    expect(store.getSelection().has('b')).toBe(true);
    store.clearSelection();
    expect(store.getSelection().size).toBe(0);
    store.selectWithin({ x: 0, y: 0, w: 50, h: 5 });
    expect(store.getSelection().size).toBe(2);
    store.removeSelected();
    expect(store.getShapes().length).toBe(0);
    store.setGridEnabled(true);
    store.setGridSpacing(12);
    expect(store.getGridEnabled()).toBe(true);
    expect(store.getGridSpacing()).toBe(12);
    const box = store.boundsOf([
      { x: 10, y: 10, w: 5, h: 5 },
      { x: 20, y: 15, w: 5, h: 5 },
    ]);
    expect(box.x).toBe(10);
    expect(box.y).toBe(10);
    expect(box.w).toBe(15);
    expect(box.h).toBe(10);
    off();
    expect(calls.length).toBeGreaterThan(0);
  });
});
