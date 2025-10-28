<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  const {
    name,
    id,
    label,
    checked = false,
    value,
  } = $props<{
    name: string;
    id: string;
    label: string;
    value: string;
    checked?: boolean;
  }>();
  const dispatch = createEventDispatcher<{ change: string | null }>();
  let internal = $state(checked);
  $effect(() => (internal = checked));
  function onChange(e: any) {
    internal = Boolean(e.currentTarget?.checked);
    dispatch('change', internal ? value : null);
  }
</script>

<label class="radio">
  <input type="radio" {id} {name} {value} checked={internal} onchange={onChange} />
  <span class="dot" aria-hidden="true"></span>
  <span class="txt">{label}</span>
</label>

<style>
  .radio {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
  }
  input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }
  .dot {
    width: 16px;
    height: 16px;
    border: 1px solid var(--color-border);
    border-radius: 50%;
    background: var(--color-bg);
    display: inline-block;
  }
  :global(input:checked) + .dot {
    box-shadow: inset 0 0 0 4px var(--color-accent);
    border-color: var(--color-accent);
  }
</style>
