<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Snippet } from 'svelte';
  import { createViewport, pan, reset, zoomAt, type Viewport } from './viewport';

  let {
    width = 2000,
    height = 1200,
    vp = $bindable(createViewport({}, { minScale: 0.25, maxScale: 4 })),
    children,
  } = $props<{
    width?: number;
    height?: number;
    vp?: Viewport | null;
    children?: Snippet;
  }>();
  let root: HTMLDivElement | null = null;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  const dispatch = createEventDispatcher<{
    backgrounddown: PointerEvent;
    backgroundmove: PointerEvent;
    backgroundup: PointerEvent;
  }>();

  function emitBackground(
    type: 'backgrounddown' | 'backgroundmove' | 'backgroundup',
    event: PointerEvent,
  ) {
    if (event.currentTarget === event.target) {
      dispatch(type, event);
    }
  }

  function onWheel(event: WheelEvent) {
    if (!root) return;
    event.preventDefault();
    const factor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
    const rect = root.getBoundingClientRect();
    vp = zoomAt(vp, factor, event.clientX, event.clientY, { left: rect.left, top: rect.top });
  }

  function onPointerDown(event: PointerEvent) {
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    const t = event.target as { setPointerCapture?: (_: number) => void };
    if (t && typeof t.setPointerCapture === 'function') t.setPointerCapture(event.pointerId);
    emitBackground('backgrounddown', event);
  }

  function onPointerMove(event: PointerEvent) {
    if (dragging) {
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      lastX = event.clientX;
      lastY = event.clientY;
      vp = pan(vp, dx, dy);
    }
    emitBackground('backgroundmove', event);
  }

  function onPointerUp(event: PointerEvent) {
    dragging = false;
    const t = event.target as { releasePointerCapture?: (_: number) => void };
    if (t && typeof t.releasePointerCapture === 'function')
      t.releasePointerCapture(event.pointerId);
    emitBackground('backgroundup', event);
  }

  function onDoubleClick() {
    vp = reset(vp);
  }
</script>

<div
  bind:this={root}
  class="canvas-root"
  onwheel={onWheel}
  onpointerdown={(e) => {
    onPointerDown(e);
  }}
  onpointermove={(e) => {
    onPointerMove(e);
  }}
  onpointerup={(e) => {
    onPointerUp(e);
  }}
  ondblclick={onDoubleClick}
  role="region"
  aria-label="Canvas"
>
  <div
    class="viewport"
    style={`transform: translate(${vp.x}px, ${vp.y}px) scale(${vp.scale}); width: ${width}px; height: ${height}px;`}
  >
    {@render children?.()}
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
