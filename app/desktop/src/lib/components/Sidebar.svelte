<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { SvelteMap } from 'svelte/reactivity';
  import { debug, logSafely } from '$lib/logging';
  import type { SidebarTreeNode } from './sidebar.types';
  // Minimal tree sidebar. Emits `select` events with an id.
  const { items = [], activeId = null } = $props<{
    items?: SidebarTreeNode[];
    activeId?: string | null;
  }>();
  const dispatch = createEventDispatcher<{ select: { id: string } }>();
  // SvelteMap provides mutation-aware semantics so the tree reacts to expand/collapse toggles.
  const expanded = new SvelteMap<string, boolean>();
  const parentMap = $derived(() => {
    const map = new SvelteMap<string, string | null>();
    const walk = (nodes: SidebarTreeNode[], parent: string | null) => {
      for (const node of nodes) {
        map.set(node.id, parent);
        if (node.children?.length) {
          walk(node.children, node.id);
        }
      }
    };
    walk(items, null);
    return map;
  });
  function toggle(id: string) {
    const next = !(expanded.get(id) ?? false);
    expanded.set(id, next);
    logSafely(debug, `renderer: sidebar toggle id=${id} expanded=${next}`);
  }
  function select(id: string) {
    logSafely(debug, `renderer: sidebar select id=${id}`);
    dispatch('select', { id });
  }

  $effect(() => {
    if (!activeId) {
      return;
    }
    const map = parentMap();
    let cursor: string | null | undefined = map.get(activeId);
    while (cursor) {
      if (!(expanded.get(cursor) ?? false)) {
        expanded.set(cursor, true);
      }
      cursor = map.get(cursor);
    }
  });
</script>

<aside class="sidebar" aria-label="Sidebar Tree">
  <ul class="tree" role="tree">
    {#each items as n (n)}
      <li role="treeitem" aria-expanded={!!(expanded.get(n.id) ?? false)} aria-selected="false">
        {#if n.children?.length}
          <button class="twisty" onclick={() => toggle(n.id)} aria-label="Expand/Collapse"
            ><iconify-icon
              icon={(expanded.get(n.id) ?? false)
                ? 'fluent:chevron-down-12-regular'
                : 'fluent:chevron-right-12-regular'}
              aria-hidden="true"
            ></iconify-icon></button
          >
        {:else}
          <span class="twisty placeholder" aria-hidden="true">•</span>
        {/if}
        <button class={n.id === activeId ? 'node active' : 'node'} onclick={() => select(n.id)}>
          <span class="node-label">{n.label}</span>
        </button>
        {#if n.children && (expanded.get(n.id) ?? false)}
          <ul class="tree" role="group">
            {#each n.children as c (c)}
              <li>
                <span class="twisty placeholder" aria-hidden="true">•</span>
                <button
                  class={c.id === activeId ? 'node active' : 'node'}
                  onclick={() => select(c.id)}
                >
                  <span class="node-label">{c.label}</span>
                </button>
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
    width: 280px;
    border-right: 1px solid rgba(15, 23, 42, 0.12);
    padding: 16px 12px;
    overflow: auto;
    background: linear-gradient(
      180deg,
      rgba(248, 250, 255, 0.92) 0%,
      rgba(243, 246, 255, 0.9) 100%
    );
    backdrop-filter: blur(18px);
  }
  .tree {
    list-style: none;
    padding-left: 4px;
    margin: 0;
    display: grid;
    gap: 4px;
  }
  .tree > li {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 2px 0;
  }
  .twisty {
    background: none;
    border: none;
    width: 24px;
    height: 24px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: rgba(15, 23, 42, 0.55);
    cursor: pointer;
  }
  .placeholder {
    opacity: 0.35;
    cursor: default;
  }
  .node {
    justify-content: flex-start;
    background: none;
    border: none;
    padding: 6px 10px;
    border-radius: 10px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-weight: 500;
    color: rgba(15, 23, 42, 0.78);
    cursor: pointer;
    transition:
      background 0.18s ease,
      box-shadow 0.18s ease;
  }
  .node:hover {
    background: rgba(99, 102, 241, 0.08);
    box-shadow: inset 0 0 0 1px rgba(99, 102, 241, 0.24);
  }
  .node.active {
    background: rgba(59, 130, 246, 0.14);
    color: rgb(30, 64, 175);
    box-shadow: inset 0 0 0 1px rgba(59, 130, 246, 0.38);
  }
  .node-label {
    text-align: left;
  }

  @media (max-width: 900px) {
    .sidebar {
      width: 240px;
      padding: 12px 10px;
    }
  }
</style>
