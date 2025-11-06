<script lang="ts">
  import type { Snippet } from 'svelte';
  let {
    label,
    help,
    error,
    required = false,
    forId,
    children,
    below,
  } = $props<{
    label: string;
    help?: string;
    error?: string;
    required?: boolean;
    forId?: string;
    children?: Snippet;
    below?: Snippet;
  }>();
</script>

<div class="field">
  <label class="label" for={forId}>
    {label}{required ? ' *' : ''}
  </label>
  <div class="control">{@render children?.()}</div>
  {#if error}
    <div class="error" role="alert">{error}</div>
  {:else if help}
    <div class="help">{help}</div>
  {/if}
  {@render below?.()}
  <span class="focus-ring"></span>
  <span class="border"></span>
  <span class="bg"></span>
  <span class="shadow"></span>
</div>

<style>
  .field {
    display: grid;
    gap: 6px;
    position: relative;
  }
  .label {
    color: var(--color-muted);
    font-size: 12px;
  }
  .control {
    display: block;
  }
  .help {
    color: var(--color-muted);
    font-size: 12px;
  }
  .error {
    color: var(--color-danger);
    font-size: 12px;
  }
</style>
