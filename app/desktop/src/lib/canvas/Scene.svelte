<script lang="ts">
  import Canvas from './Canvas.svelte';
  import { getShape } from '$lib/registries/shape-registry';
  import {
    boundsOf,
    clearSelection,
    getSelection,
    getShapes,
    initDefaultShapes,
    selectOnly,
    selectWithin,
    subscribe,
    toggleSelect,
  } from './shape-store';
  import { fitToBounds, reset, type Viewport } from './viewport';

  let _tick = 0;
  let vp: Viewport | null = null;
  let rootEl = null;

  initDefaultShapes();
  const unsubscribe = subscribe(() => (_tick = (_tick + 1) & 0xff));
  $effect(() => unsubscribe());

  let marquee: { active: boolean; x: number; y: number; w: number; h: number } = {
    active: false,
    x: 0,
    y: 0,
    w: 0,
    h: 0,
  };

  function onBackgroundDown(e) {
    if (e.shiftKey) {
      marquee = { active: true, x: e.clientX, y: e.clientY, w: 0, h: 0 };
    } else {
      clearSelection();
    }
  }
  function onBackgroundMove(e) {
    if (!marquee.active) return;
    marquee = { ...marquee, w: e.clientX - marquee.x, h: e.clientY - marquee.y };
  }
  function onBackgroundUp() {
    if (!marquee.active) return;
    const x = Math.min(marquee.x, marquee.x + marquee.w);
    const y = Math.min(marquee.y, marquee.y + marquee.h);
    const w = Math.abs(marquee.w);
    const h = Math.abs(marquee.h);
    // Convert from client space to canvas local coordinates considering viewport
    if (!vp || !rootEl) return;
    const rect = rootEl.getBoundingClientRect();
    const local = {
      x: (x - rect.left - vp.x) / vp.scale,
      y: (y - rect.top - vp.y) / vp.scale,
      w: w / vp.scale,
      h: h / vp.scale,
    };
    selectWithin(local);
    marquee = { active: false, x: 0, y: 0, w: 0, h: 0 };
  }

  function onShapeClick(e, id: string) {
    e.stopPropagation();
    if (e.shiftKey) toggleSelect(id);
    else selectOnly(id);
  }

  function zoomIn() {
    if (!vp || !rootEl) return;
    const rect = rootEl.getBoundingClientRect();
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
    if (!vp || !rootEl) return;
    const rect = rootEl.getBoundingClientRect();
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
    if (!vp || !rootEl) return;
    const b = boundsOf(getShapes());
    const rect = rootEl.getBoundingClientRect();
    vp = fitToBounds(vp, { width: rect.width, height: rect.height }, b, 40);
  }
</script>

<div class="scene">
  <Canvas
    bind:this={rootEl}
    bind:vp
    on:backgrounddown={onBackgroundDown}
    on:backgroundmove={onBackgroundMove}
    on:backgroundup={onBackgroundUp}
  >
    {#each getShapes() as s (s.id)}
      {#if getShape(s.typeId)}
        <div
          on:click={(e) => onShapeClick(e, s.id)}
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
      />
    {/if}
  </Canvas>
  <div class="controls">
    <button on:click={zoomOut} title="Zoom out">−</button>
    <button on:click={zoom100} title="Actual size">100%</button>
    <button on:click={zoomIn} title="Zoom in">+</button>
    <button on:click={zoomFit} title="Fit to content">Fit</button>
  </div>
</div>

<style>
  .scene {
    position: relative;
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
</style>
