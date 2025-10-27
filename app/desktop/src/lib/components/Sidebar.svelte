<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  // Minimal tree sidebar. Emits `select` events with an id.
  type Node = { id: string; label: string; children?: Node[] };
  const { items = [] } = $props<{ items?: Node[] }>();
  const dispatch = createEventDispatcher<{ select: { id: string } }>();
  // `$state` rune keeps ancestry toggles reactive per the Svelte reactivity guidance,
  // avoiding an external store for this scoped component state.
  let expanded = $state(new Map<string, boolean>());
  function toggle(id: string) {
    expanded.set(id, !(expanded.get(id) ?? false));
  }
  function select(id: string) {
    dispatch('select', { id });
  }
</script>

<aside class="sidebar" aria-label="Sidebar Tree">
  <ul class="tree" role="tree">
    {#each items as n (n)}
      <li role="treeitem" aria-expanded={!!(expanded.get(n.id) ?? false)} aria-selected="false">
        {#if n.children?.length}
          <button class="twisty" onclick={() => toggle(n.id)} aria-label="Expand/Collapse"
            >{(expanded.get(n.id) ?? false) ? '▾' : '▸'}</button
          >
        {:else}
          <span class="twisty" style="opacity:.2">•</span>
        {/if}
        <button class="node" onclick={() => select(n.id)}>{n.label}</button>
        {#if n.children && (expanded.get(n.id) ?? false)}
          <ul class="tree" role="group">
            {#each n.children as c (c)}
              <li>
                <span class="twisty" style="opacity:.2">•</span>
                <button class="node" onclick={() => select(c.id)}>{c.label}</button>
              </li>
            {/each}
          </ul>
        {/if}
      </li>
    {/each}
  </ul>
</aside>

<style>
  .sidebar {
    width: 260px;
    border-right: 1px solid rgba(0, 0, 0, 0.08);
    padding: 8px;
    overflow: auto;
  }
  .tree {
    list-style: none;
    padding-left: 8px;
    margin: 0;
  }
  .tree > li {
    margin: 2px 0;
  }
  .twisty {
    background: none;
    border: none;
    width: 18px;
  }
  .node {
    background: none;
    border: none;
    padding: 4px 6px;
    border-radius: 6px;
  }
  .node:hover {
    background: color-mix(in srgb, currentColor 8%, transparent);
  }
</style>
