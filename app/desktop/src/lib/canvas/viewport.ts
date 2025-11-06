export interface Viewport {
  x: number;
  y: number;
  scale: number;
  minScale: number;
  maxScale: number;
}

export function createViewport(
  init: Partial<Pick<Viewport, 'x' | 'y' | 'scale'>> = {},
  bounds: { minScale?: number; maxScale?: number } = {},
): Viewport {
  return {
    x: init.x ?? 0,
    y: init.y ?? 0,
    scale: clamp(init.scale ?? 1, bounds.minScale ?? 0.25, bounds.maxScale ?? 4),
    minScale: bounds.minScale ?? 0.25,
    maxScale: bounds.maxScale ?? 4,
  };
}

export function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

export function pan(vp: Viewport, dx: number, dy: number): Viewport {
  return { ...vp, x: vp.x + dx, y: vp.y + dy };
}

export function zoomAt(
  vp: Viewport,
  factor: number,
  clientX: number,
  clientY: number,
  elementRect: { left: number; top: number },
): Viewport {
  const nextScale = clamp(vp.scale * factor, vp.minScale, vp.maxScale);
  const scaleDelta = nextScale / vp.scale;
  // Keep the zoom focal point (clientX/Y) stable under the cursor
  const originX = clientX - elementRect.left;
  const originY = clientY - elementRect.top;
  const nx = originX - (originX - vp.x) * scaleDelta;
  const ny = originY - (originY - vp.y) * scaleDelta;
  return { ...vp, x: nx, y: ny, scale: nextScale };
}

export function reset(vp: Viewport): Viewport {
  return { ...vp, x: 0, y: 0, scale: 1 };
}

export function fitToBounds(
  vp: Viewport,
  container: { width: number; height: number },
  bounds: { x: number; y: number; w: number; h: number },
  padding = 40,
): Viewport {
  if (bounds.w <= 0 || bounds.h <= 0) return reset(vp);
  const scaleX = (container.width - padding * 2) / bounds.w;
  const scaleY = (container.height - padding * 2) / bounds.h;
  const nextScale = clamp(Math.min(scaleX, scaleY), vp.minScale, vp.maxScale);
  // Position so that bounds.x/y end up at padding
  const nx = padding - bounds.x * nextScale;
  const ny = padding - bounds.y * nextScale;
  return { ...vp, x: nx, y: ny, scale: nextScale };
}
