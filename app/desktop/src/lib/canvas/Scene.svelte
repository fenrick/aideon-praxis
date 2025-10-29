<script lang="ts">
  import Canvas from './Canvas.svelte';
  import { getShape } from '$lib/registries/shape-registry';
  import {
    boundsOf,
    clearSelection,
    getGridEnabled,
    getGridSpacing,
    getSelection,
    getShapes,
    initDefaultShapes,
    removeSelected,
    selectOnly,
    selectWithin,
    setGridEnabled,
    subscribe,
    toggleSelect,
  } from './shape-store';
  import { fitToBounds, reset, type Viewport } from './viewport';

  let _tick = 0;
  let vp = $state<Viewport | null>(null);
  let sceneEl: HTMLDivElement | null = null;

  initDefaultShapes();
  const unsubscribe = subscribe(() => (_tick = (_tick + 1) & 0xff));
  $effect(() => unsubscribe());

  let marquee = $state<{ active: boolean; x: number; y: number; w: number; h: number }>({
    active: false,
    x: 0,
    y: 0,
    w: 0,
    h: 0,
  });

  let dragging: {
    active: boolean;
    ids: string[];
    startX: number;
    startY: number;
    base: ReturnType<typeof getShapes>;
  } = { active: false, ids: [], startX: 0, startY: 0, base: [] };

  function onBackgroundDown(e: CustomEvent<PointerEvent>) {
    const ev = e.detail;
    if (ev.shiftKey) {
      marquee = { active: true, x: ev.clientX, y: ev.clientY, w: 0, h: 0 };
    } else {
      clearSelection();
    }
  }
  function onBackgroundMove(e: CustomEvent<PointerEvent>) {
    const ev = e.detail;
    if (!marquee.active) return;
    marquee = { ...marquee, w: ev.clientX - marquee.x, h: ev.clientY - marquee.y };
  }
  function onBackgroundUp() {
    if (!marquee.active) return;
    const x = Math.min(marquee.x, marquee.x + marquee.w);
    const y = Math.min(marquee.y, marquee.y + marquee.h);
    const w = Math.abs(marquee.w);
    const h = Math.abs(marquee.h);
    // Convert from client space to canvas local coordinates considering viewport
    if (!vp || !sceneEl) return;
    const rect = sceneEl.getBoundingClientRect();
    const local = {
      x: (x - rect.left - vp.x) / vp.scale,
      y: (y - rect.top - vp.y) / vp.scale,
      w: w / vp.scale,
      h: h / vp.scale,
    };
    selectWithin(local);
    marquee = { active: false, x: 0, y: 0, w: 0, h: 0 };
  }

  function onShapeClick(e: MouseEvent, id: string) {
    e.stopPropagation();
    if (e.shiftKey) toggleSelect(id);
    else selectOnly(id);
  }

  function onShapePointerDown(e: PointerEvent, id: string) {
    e.stopPropagation();
    const sel = getSelection();
    const ids = sel.has(id) ? [...sel] : [id];
    dragging = {
      active: true,
      ids,
      startX: e.clientX,
      startY: e.clientY,
      base: getShapes().map((s) => ({ ...s })),
    };
  }
  function onRootPointerMove(e: PointerEvent) {
    if (!dragging.active || !vp || !sceneEl) return;
    const dx = (e.clientX - dragging.startX) / vp.scale;
    const dy = (e.clientY - dragging.startY) / vp.scale;
    const snap = getGridEnabled();
    const gs = getGridSpacing();
    const moved = dragging.base.map((s) => {
      if (!dragging.ids.includes(s.id)) return s;
      let nx = s.x + dx;
      let ny = s.y + dy;
      if (snap) {
        nx = Math.round(nx / gs) * gs;
        ny = Math.round(ny / gs) * gs;
      }
      return { ...s, x: nx, y: ny };
    });
    // Overwrite shapes in store (defer to next microtask)
    import('./shape-store').then((mod) => mod.setShapes(moved)).catch(() => {});
  }
  function onRootPointerUp() {
    dragging = { active: false, ids: [], startX: 0, startY: 0, base: [] };
  }

  function zoomIn() {
    if (!vp || !sceneEl) return;
    const rect = sceneEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    vp.scale = Math.min(vp.maxScale, vp.scale * 1.1);
    const curr = vp;
    vp = {
      ...curr,
      x: curr.x + (cx - rect.left) * (1 - 1.1),
      y: curr.y + (cy - rect.top) * (1 - 1.1),
    };
  }
  function zoomOut() {
    if (!vp || !sceneEl) return;
    const rect = sceneEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const factor = 1 / 1.1;
    const nextScale = Math.max(vp.minScale, vp.scale * factor);
    const curr = vp;
    vp = {
      ...curr,
      scale: nextScale,
      x: curr.x + (cx - rect.left) * (1 - factor),
      y: curr.y + (cy - rect.top) * (1 - factor),
    };
  }
  function zoom100() {
    if (!vp) return;
    vp = reset(vp);
  }
  function zoomFit() {
    if (!vp || !sceneEl) return;
    const b = boundsOf(getShapes());
    const rect = sceneEl.getBoundingClientRect();
    vp = fitToBounds(vp, { width: rect.width, height: rect.height }, b, 40);
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      clearSelection();
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      removeSelected();
      e.preventDefault();
    }
  }
</script>

<div
  class="scene"
  role="application"
  tabindex="0"
  bind:this={sceneEl}
  onkeydown={onKeydown}
  onpointermove={onRootPointerMove}
  onpointerup={onRootPointerUp}
>
  <Canvas
    bind:vp
    on:backgrounddown={onBackgroundDown}
    on:backgroundmove={onBackgroundMove}
    on:backgroundup={onBackgroundUp}
  >
    {#each getShapes() as s (s.id)}
      {#if getShape(s.typeId)}
        <div
          role="button"
          tabindex="0"
          onpointerdown={(e) => onShapePointerDown(e, s.id)}
          onclick={(e) => onShapeClick(e as any, s.id)}
          onkeydown={(e) => {
            const k = (e as KeyboardEvent).key;
            if (k === 'Enter' || k === ' ') onShapeClick(e as any, s.id);
          }}
          class={`shape ${getSelection().has(s.id) ? 'selected' : ''}`}
          style={`left:${s.x}px;top:${s.y}px;width:${s.w}px;height:${s.h}px;`}
        >
          <svelte:component
            this={getShape(s.typeId)!.component as any}
            {...s.props || {}}
            width={s.w}
            height={s.h}
          />
        </div>
      {/if}
    {/each}
    {#if marquee.active}
      <div
        class="marquee"
        style={`left:${Math.min(marquee.x, marquee.x + marquee.w)}px;top:${Math.min(marquee.y, marquee.y + marquee.h)}px;width:${Math.abs(marquee.w)}px;height:${Math.abs(marquee.h)}px;`}
      ></div>
    {/if}
  </Canvas>
  {#if getGridEnabled()}
    <div class="grid-overlay"></div>
  {/if}
  <div class="controls">
    <button onclick={zoomOut} title="Zoom out">−</button>
    <button onclick={zoom100} title="Actual size">100%</button>
    <button onclick={zoomIn} title="Zoom in">+</button>
    <button onclick={zoomFit} title="Fit to content">Fit</button>
    <label class="grid-toggle"
      ><input
        type="checkbox"
        checked={getGridEnabled()}
        onchange={(e) => setGridEnabled((e.currentTarget as any).checked)}
      /> Grid</label
    >
    <span class="zoom">{Math.round((vp?.scale ?? 1) * 100)}%</span>
  </div>
</div>

<style>
  .scene {
    position: relative;
    outline: none;
  }
  .shape {
    position: absolute;
    cursor: default;
  }
  .shape.selected {
    outline: 2px solid #3b82f6;
    outline-offset: 1px;
  }
  .marquee {
    position: fixed;
    border: 1px dashed #3b82f6;
    background: rgba(59, 130, 246, 0.1);
    pointer-events: none;
  }
  .controls {
    position: absolute;
    right: 12px;
    bottom: 12px;
    display: inline-flex;
    gap: 6px;
    background: rgba(0, 0, 0, 0.4);
    padding: 6px;
    border-radius: 8px;
  }
  .controls > button {
    background: white;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    padding: 2px 8px;
    cursor: pointer;
  }
  .grid-overlay {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background-image:
      linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px);
    background-size: 20px 20px;
  }
  .grid-toggle {
    color: white;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .zoom {
    color: white;
    margin-left: 4px;
  }
</style>
