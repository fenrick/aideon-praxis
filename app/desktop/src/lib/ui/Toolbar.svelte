<script lang="ts">
  const { title } = $props<{ title?: string }>();
</script>

<div class="toolbar" role="toolbar" aria-label={title ?? 'Toolbar'}>
  <div class="group">
    <slot />
  </div>
  <div class="spacer"></div>
  <div class="group end">
    <slot name="end" />
  </div>
</div>

<style>
  .toolbar {
    height: 36px;
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: 0 var(--space-2);
    border-bottom: 1px solid var(--color-border);
    background: var(--color-surface);
  }
  .group {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
  }
  .spacer {
    flex: 1;
  }
  .end {
    justify-content: flex-end;
  }
  :global(.separator) {
    width: 1px;
    height: 22px;
    background: var(--color-border);
  }
</style>
