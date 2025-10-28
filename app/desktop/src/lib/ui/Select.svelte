<script lang="ts">
  import Field from './Field.svelte';
  import { createEventDispatcher } from 'svelte';
  const {
    id,
    label,
    options = [],
    value,
    help,
    error,
    required = false,
  } = $props<{
    id: string;
    label: string;
    options?: { value: string; label: string }[];
    value?: string;
    help?: string;
    error?: string;
    required?: boolean;
  }>();
  const dispatch = createEventDispatcher<{ change: string }>();
  let internal = $state(value ?? '');
  $effect(() => (internal = value ?? ''));
  function onChange(e: any) {
    internal = e.currentTarget?.value ?? '';
    dispatch('change', internal);
  }
</script>

<Field {label} {help} {error} {required} forId={id}>
  <select {id} class="select" bind:value={internal} onchange={onChange}>
    {#each options as opt (opt.value)}
      <option value={opt.value}>{opt.label}</option>
    {/each}
  </select>
</Field>

<style>
  .select {
    height: 32px;
    width: 100%;
    border-radius: var(--radius-1);
    border: 1px solid var(--color-border);
    background: var(--color-bg);
    color: var(--color-text);
    padding: 0 var(--space-3);
  }
</style>
