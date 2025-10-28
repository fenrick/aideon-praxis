<script lang="ts">
  import Field from './Field.svelte';
  import { createEventDispatcher, onMount } from 'svelte';
  import { getResolvedUiTheme, onUiThemeChange } from '$lib/theme/platform';
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
  let platform = $state(getResolvedUiTheme());
  onMount(() => onUiThemeChange((t) => (platform = t)));
</script>

<Field {label} {help} {error} {required} forId={id}>
  {#if platform === 'win'}
    <fluent-select {id} value={internal} onchange={onChange}>
      {#each options as opt (opt.value)}
        <option value={opt.value}>{opt.label}</option>
      {/each}
    </fluent-select>
  {:else if platform === 'mac'}
    <div class="p-form-select">
      <select {id} bind:value={internal} onchange={onChange}>
        {#each options as opt (opt.value)}
          <option value={opt.value}>{opt.label}</option>
        {/each}
      </select>
    </div>
  {:else}
    <select {id} class="tw-select" bind:value={internal} onchange={onChange}>
      {#each options as opt (opt.value)}
        <option value={opt.value}>{opt.label}</option>
      {/each}
    </select>
  {/if}
</Field>

<style></style>
