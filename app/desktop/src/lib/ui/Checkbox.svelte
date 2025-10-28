<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  const { id, label, checked = false } = $props<{ id: string; label: string; checked?: boolean }>();
  const dispatch = createEventDispatcher<{ change: boolean }>();
  let internal = $state(checked);
  $effect(() => (internal = checked));
  function onChange(e: any) {
    internal = Boolean(e.currentTarget?.checked);
    dispatch('change', internal);
  }
</script>

<label class="chk">
  <input {id} type="checkbox" bind:checked={internal} onchange={onChange} />
  <span class="box" aria-hidden="true"></span>
  <span class="txt">{label}</span>
  <span class="focus-ring"></span>
</label>

<style>
  .chk {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    position: relative;
  }
  input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }
  .box {
    width: 16px;
    height: 16px;
    border-radius: 4px;
    border: 1px solid var(--color-border);
    background: var(--color-bg);
    display: inline-block;
  }
  :global(input:checked) + .box {
    background: var(--color-accent);
    border-color: var(--color-accent);
  }
  .txt {
    color: var(--color-text);
  }
</style>
