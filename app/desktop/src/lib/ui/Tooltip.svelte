<script lang="ts">
  import type { Snippet } from 'svelte';
  import { onMount } from 'svelte';
  import { getResolvedUiTheme, onUiThemeChange } from '$lib/theme/platform';
  let { text = '', children } = $props<{ text?: string; children?: Snippet }>();
  let open = $state(false);
  let platform = $state(getResolvedUiTheme());
  let anchorId = $state('tip-' + Math.random().toString(36).slice(2));
  onMount(() => onUiThemeChange((t) => (platform = t)));
</script>

{#if platform === 'win'}
  <span id={anchorId} class="tip-wrap">
    {@render children?.()}
    {#if text}
      <fluent-tooltip anchor={anchorId}>{text}</fluent-tooltip>
    {/if}
  </span>
{:else}
  <span
    class="tip-wrap"
    role="button"
    tabindex="0"
    onmouseenter={() => (open = true)}
    onmouseleave={() => (open = false)}
    onfocus={() => (open = true)}
    onblur={() => (open = false)}
  >
    {@render children?.()}
    {#if open && text}
      <span class="tip" role="tooltip">{text}</span>
    {/if}
  </span>
{/if}

<style>
  .tip-wrap {
    position: relative;
    display: inline-block;
  }
  .tip {
    position: absolute;
    bottom: calc(100% + 6px);
    left: 50%;
    transform: translateX(-50%);
    white-space: nowrap;
    background: var(--color-text);
    color: var(--color-bg);
    font-size: 12px;
    padding: 4px 8px;
    border-radius: 6px;
    box-shadow: var(--shadow-2);
  }
</style>
