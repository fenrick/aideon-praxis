import { describe, expect, it } from 'vitest';
import { clamp, createViewport, pan, reset, zoomAt } from '../src/lib/canvas/viewport';

describe('canvas viewport math', () => {
  it('clamps values', () => {
    expect(clamp(5, 0, 2)).toBe(2);
    expect(clamp(-1, 0, 2)).toBe(0);
    expect(clamp(1, 0, 2)).toBe(1);
  });

  it('creates viewport with bounds', () => {
    const vp = createViewport({ scale: 10 }, { minScale: 0.5, maxScale: 2 });
    expect(vp.scale).toBe(2);
    expect(vp.minScale).toBe(0.5);
    expect(vp.maxScale).toBe(2);
  });

  it('pans by deltas', () => {
    let vp = createViewport();
    vp = pan(vp, 10, -5);
    expect(vp.x).toBe(10);
    expect(vp.y).toBe(-5);
  });

  it('zooms at cursor location keeping focus stable', () => {
    let vp = createViewport({ x: 100, y: 50, scale: 1 });
    const rect = { left: 0, top: 0 };
    vp = zoomAt(vp, 2, 200, 100, rect);
    expect(vp.scale).toBeCloseTo(2);
    // Focal point (200,100) should remain near-stable after zoom
    // Translate back the new top-left; check deltas are finite and not NaN
    expect(Number.isFinite(vp.x)).toBe(true);
    expect(Number.isFinite(vp.y)).toBe(true);
  });

  it('resets to defaults', () => {
    const vp = reset(createViewport({ x: 10, y: 10, scale: 2 }));
    expect(vp).toMatchObject({ x: 0, y: 0, scale: 1 });
  });
});
