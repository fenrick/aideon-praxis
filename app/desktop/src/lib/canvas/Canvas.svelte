<script lang="ts">
  import { createViewport, pan, reset, zoomAt, type Viewport } from './viewport';

  const { width = 2000, height = 1200 } = $props<{ width?: number; height?: number }>();

  export let vp: Viewport = createViewport({}, { minScale: 0.25, maxScale: 4 });
  let root = null;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  function onWheel(event) {
    if (!root) return;
    event.preventDefault();
    const factor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
    const rect = root.getBoundingClientRect();
    vp = zoomAt(vp, factor, event.clientX, event.clientY, { left: rect.left, top: rect.top });
  }

  function onPointerDown(event) {
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    const t = event.target as { setPointerCapture?: (_: number) => void };
    if (t && typeof t.setPointerCapture === 'function') t.setPointerCapture(event.pointerId);
  }
  function onPointerMove(event) {
    if (!dragging) return;
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;
    vp = pan(vp, dx, dy);
  }
  function onPointerUp(event) {
    dragging = false;
    const t = event.target as { releasePointerCapture?: (_: number) => void };
    if (t && typeof t.releasePointerCapture === 'function')
      t.releasePointerCapture(event.pointerId);
  }
  function onDoubleClick() {
    vp = reset(vp);
  }
  // Non-typed event forwarding for background pointer interactions
  function forward(type: string, e: unknown) {
    const ev = e as any;
    if (ev.currentTarget === ev.target) dispatchEvent(type, ev);
  }
  function dispatchEvent(type: string, detail: unknown) {
    const CE = (globalThis as any).CustomEvent;
    const event = new CE(type, { detail, bubbles: true });
    root && (root as any).dispatchEvent(event);
  }
</script>

<div
  bind:this={root}
  class="canvas-root"
  on:wheel={onWheel}
  on:pointerdown={(e) => {
    onPointerDown(e);
    forward('backgrounddown', e);
  }}
  on:pointermove={(e) => {
    onPointerMove(e);
    forward('backgroundmove', e);
  }}
  on:pointerup={(e) => {
    onPointerUp(e);
    forward('backgroundup', e);
  }}
  on:dblclick={onDoubleClick}
  role="region"
  aria-label="Canvas"
>
  <div
    class="viewport"
    style={`transform: translate(${vp.x}px, ${vp.y}px) scale(${vp.scale}); width: ${width}px; height: ${height}px;`}
  >
    <slot />
  </div>
</div>

<style>
  .canvas-root {
    position: relative;
    width: 100%;
    height: 60vh;
    user-select: none;
    overflow: hidden;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-2);
  }
  .viewport {
    transform-origin: 0 0;
    will-change: transform;
  }
</style>
