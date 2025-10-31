import { describe, expect, it } from 'vitest';

describe('elk layout wrapper', () => {
  it('positions nodes using rectpacking by default', async () => {
    const { layoutShapesWithElk } = await import('../src/lib/canvas/layout/elk');
    const shapes = [
      { id: 'a', typeId: 'rect', x: 0, y: 0, w: 120, h: 80, props: {} },
      { id: 'b', typeId: 'rect', x: 0, y: 0, w: 200, h: 120, props: {} },
    ];
    const out = await layoutShapesWithElk(shapes);
    expect(out).toHaveLength(2);
    // Positions should be finite numbers and at least one differs
    expect(Number.isFinite(out[0].x)).toBe(true);
    expect(Number.isFinite(out[0].y)).toBe(true);
    expect(Number.isFinite(out[1].x)).toBe(true);
    expect(Number.isFinite(out[1].y)).toBe(true);
    const same = out[0].x === out[1].x && out[0].y === out[1].y;
    expect(same).toBe(false);
    // Sizes propagated unchanged
    expect(out[1].w).toBe(200);
    expect(out[1].h).toBe(120);
  });
});
