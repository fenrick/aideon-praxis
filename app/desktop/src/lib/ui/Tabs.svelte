<script lang="ts">
  export type TabItem = { id: string; title: string; dirty?: boolean };
  const {
    tabs = [],
    activeId,
    onSelect,
    onClose,
  } = $props<{
    tabs?: TabItem[];
    activeId: string | null;
    onSelect: (_id: string) => void;
    onClose?: (_id: string) => void;
  }>();
</script>

<div class="tabs" role="tablist" aria-label="Documents">
  {#each tabs as t (t.id)}
    <button
      role="tab"
      aria-selected={t.id === activeId}
      class="tab"
      onclick={() => onSelect(t.id)}
      title={t.title}
    >
      <span class="label">{t.title}{t.dirty ? '*' : ''}</span>
      {#if onClose}
        <span class="spacer" />
        <span class="close" onclick={(e) => (e.stopPropagation(), onClose?.(t.id))}>×</span>
      {/if}
    </button>
  {/each}
  <slot name="after" />
  <div class="fill"></div>
</div>

<style>
  .tabs {
    height: 36px;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 var(--space-2);
    border-bottom: 1px solid var(--color-border);
    background: var(--color-surface);
  }
  .tab {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 26px;
    padding: 0 10px;
    border-radius: var(--radius-1);
    border: 1px solid transparent;
    background: transparent;
    color: var(--color-text);
  }
  .tab[aria-selected='true'] {
    border-color: var(--color-border);
    background: var(--color-bg);
    box-shadow: var(--shadow-1);
  }
  .label {
    max-width: 200px;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
  }
  .spacer {
    width: 4px;
  }
  .close {
    opacity: 0.7;
  }
  .fill {
    flex: 1;
  }
</style>
