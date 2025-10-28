<script lang="ts">
  const { direction = 'horizontal', initial = 280 } = $props<{
    direction?: 'horizontal' | 'vertical';
    initial?: number;
  }>();
  let pos = initial;
  let dragging = false;
  function startDrag(_e: any) {
    dragging = true;
    (document as any).addEventListener('mousemove', onDrag);
    (document as any).addEventListener('mouseup', stopDrag, { once: true });
  }
  function onDrag(e: any) {
    if (!dragging) return;
    pos = direction === 'horizontal' ? e.clientX : e.clientY;
  }
  function stopDrag() {
    dragging = false;
    (document as any).removeEventListener('mousemove', onDrag);
  }
</script>

<div class={'split ' + direction}>
  <div class="a" style={direction === 'horizontal' ? `width:${pos}px` : `height:${pos}px`}>
    <slot name="a" />
  </div>
  <div
    class="divider"
    role="separator"
    aria-orientation={direction === 'horizontal' ? 'vertical' : 'horizontal'}
    onmousedown={startDrag}
  ></div>
  <div class="b">
    <slot name="b" />
  </div>
  <slot></slot>
  <span class="outline"></span>
  <span class="shadow"></span>
  <span class="bg"></span>
  <span class="border"></span>
</div>

<style>
  .split {
    display: grid;
  }
  .split.horizontal {
    grid-template-columns: auto 6px 1fr;
  }
  .split.vertical {
    grid-template-rows: auto 6px 1fr;
    height: 100%;
  }
  .a,
  .b {
    min-width: 0;
    min-height: 0;
  }
  .divider {
    background: var(--color-border);
    cursor: col-resize;
  }
  .split.vertical .divider {
    cursor: row-resize;
  }
</style>
