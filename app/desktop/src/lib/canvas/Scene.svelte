<script lang="ts">
  import Canvas from './Canvas.svelte';
  import { getShape } from '$lib/registries/shape-registry';
  import type { ComponentType } from 'svelte';
  import {
    boundsOf,
    clearSelection,
    getGridEnabled,
    getGridSpacing,
    getSelection,
    getShapes,
    initDefaultShapes,
    removeSelected,
    reloadScene,
    selectOnly,
    selectWithin,
    setGridEnabled,
    subscribe,
    toggleSelect,
    type Selection,
    type ShapeInstance,
  } from './shape-store';
  import { fitToBounds, reset, type Viewport } from './viewport';
  let shapes = $state<ShapeInstance[]>(getShapes());
  let selection = $state<Selection>(new Set(getSelection()));
  let vp = $state<Viewport | null>(null);
  let sceneEl: HTMLDivElement | null = null;

  initDefaultShapes();
  const unsubscribe = subscribe(() => {
    shapes = getShapes();
    selection = new Set(getSelection());
  });
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

  function resolveShapeComponent(typeId: string): ComponentType | null {
    const shape = getShape(typeId);
    return (shape?.component as ComponentType | undefined) ?? null;
  }

  function focusSceneRoot() {
    sceneEl?.focus();
  }

  function onBackgroundDown(e: CustomEvent<PointerEvent>) {
    const ev = e.detail;
    focusSceneRoot();
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
    const ids = selection.has(id) ? [...selection] : [id];
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

  function handlePointerMove(event: PointerEvent) {
    onRootPointerMove(event);
  }

  function handlePointerUp() {
    onRootPointerUp();
  }

  $effect(() => {
    globalThis.addEventListener('pointermove', handlePointerMove);
    globalThis.addEventListener('pointerup', handlePointerUp);
    return () => {
      globalThis.removeEventListener('pointermove', handlePointerMove);
      globalThis.removeEventListener('pointerup', handlePointerUp);
    };
  });

  function handleGlobalKeydown(event: KeyboardEvent) {
    if (!sceneEl) return;
    if (event.defaultPrevented) return;
    const target = (event.target as Element | null) ?? null;
    if (!target || sceneEl.contains(target)) {
      onKeydown(event);
    }
  }

  $effect(() => {
    globalThis.addEventListener('keydown', handleGlobalKeydown);
    return () => {
      globalThis.removeEventListener('keydown', handleGlobalKeydown);
    };
  });

  function onShapeKeydown(event: KeyboardEvent, id: string) {
    const key = event.key;
    switch (key) {
      case 'Enter':
      case ' ': {
        event.preventDefault();
        if (event.shiftKey) toggleSelect(id);
        else selectOnly(id);

        break;
      }
      case 'Delete':
      case 'Backspace': {
        event.preventDefault();
        removeSelected();

        break;
      }
      case 'Escape': {
        clearSelection();

        break;
      }
      // No default
    }
  }

  const { asOf } = $props<{ asOf?: string | null }>();

  let lastLoadedAsOf = $state<string | null>(null);

  $effect(() => {
    if (!asOf || asOf === lastLoadedAsOf) return;
    lastLoadedAsOf = asOf;
    void reloadScene(asOf);
  });

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

<div class="scene" role="application" tabindex="-1" bind:this={sceneEl}>
  <Canvas
    bind:vp
    on:backgrounddown={onBackgroundDown}
    on:backgroundmove={onBackgroundMove}
    on:backgroundup={onBackgroundUp}
  >
    {#each shapes as s (s.id)}
      {@const Component = resolveShapeComponent(s.typeId)}
      {#if Component}
        <button
          type="button"
          data-shape-id={s.id}
          aria-pressed={selection.has(s.id)}
          onpointerdown={(e) => onShapePointerDown(e, s.id)}
          onclick={(e) => onShapeClick(e as any, s.id)}
          onkeydown={(e) => onShapeKeydown(e as KeyboardEvent, s.id)}
          class={`shape ${selection.has(s.id) ? 'selected' : ''}`}
          style={`left:${s.x}px;top:${s.y}px;width:${s.w}px;height:${s.h}px;z-index:${(s as any).z ?? 0};`}
        >
          <Component {...s.props || {}} width={s.w} height={s.h} />
        </button>
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
    <div
      class="grid-overlay"
      style={`background-size: ${getGridSpacing()}px ${getGridSpacing()}px;`}
    ></div>
  {/if}
  <div class="controls">
    <button onclick={zoomOut} title="Zoom out">−</button>
    <button onclick={zoom100} title="Actual size">100%</button>
    <button onclick={zoomIn} title="Zoom in">+</button>
    <button onclick={zoomFit} title="Fit to content">Fit</button>
    <button
      onclick={() => {
        import('./shape-store')
          .then((m) => m.relayout({ algorithm: 'org.eclipse.elk.rectpacking', spacing: getGridSpacing() }))
          .catch(() => {});
      }}
      title="Relayout"
    >
      Relayout
    </button>
    <button
      onclick={() => {
        const date = asOf ?? new Date().toISOString().slice(0, 10);
        import('./shape-store')
          .then((m) => m.saveLayout(date))
          .catch(() => {});
      }}
      title="Save layout"
    >
      Save
    </button>
    <label class="grid-toggle"
      ><input
        type="checkbox"
        checked={getGridEnabled()}
        onchange={(e) => setGridEnabled((e.currentTarget as any).checked)}
      /> Grid</label
    >
    <label class="grid-toggle"
      >Spacing <input
        type="number"
        min="2"
        value={getGridSpacing()}
        onchange={(e) => {
          const v = Number((e.currentTarget as any).value);
          import('./shape-store')
            .then((m) => m.setGridSpacing(v))
            .catch(() => {});
        }}
      />
    </label>
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
    cursor: move;
    background: transparent;
    border: none;
    padding: 0;
    color: inherit;
  }
  .shape.selected {
    outline: 2px solid #3b82f6;
    outline-offset: 1px;
  }
  .shape:focus-visible {
    outline: 2px solid #2563eb;
    outline-offset: 2px;
  }
  .marquee {
    position: fixed;
    border: 1px dashed #3b82f6;
    background: rgba(59, 130, 246, 0.1);
    pointer-events: none;
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
