<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  const {
    id,
    checked = false,
    label,
  } = $props<{ id: string; checked?: boolean; label?: string }>();
  const dispatch = createEventDispatcher<{ change: boolean }>();
  let internal = checked;
  $effect(() => (internal = checked));
  function onChange(e: any) {
    internal = Boolean(e.currentTarget?.checked);
    dispatch('change', internal);
  }
</script>

<label class="switch">
  <input {id} type="checkbox" role="switch" bind:checked={internal} onchange={onChange} />
  <span class="track"><span class="thumb"></span></span>
  {#if label}<span class="txt">{label}</span>{/if}
</label>

<style>
  .switch {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
  }
  input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }
  .track {
    width: 36px;
    height: 20px;
    border-radius: 10px;
    background: var(--color-border);
    display: inline-flex;
    align-items: center;
    padding: 2px;
    transition: background 0.15s ease;
  }
  .thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--color-bg);
    transform: translateX(0);
    transition: transform 0.15s ease;
    box-shadow: var(--shadow-1);
  }
  :global(input:checked) + .track {
    background: var(--color-accent);
  }
  :global(input:checked) + .track .thumb {
    transform: translateX(16px);
    background: #fff;
  }
</style>
