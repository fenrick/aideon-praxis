<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { getResolvedUiTheme, onUiThemeChange } from '../theme/platform';
  const { id, label, checked = false } = $props<{ id: string; label: string; checked?: boolean }>();
  const dispatch = createEventDispatcher<{ change: boolean }>();
  let internal = $state(checked);
  $effect(() => (internal = checked));
  function onChange(e: any) {
    // For custom elements or inputs, prefer target.checked
    const next = (e.currentTarget as any)?.checked ?? !internal;
    internal = Boolean(next);
    dispatch('change', internal);
  }
  let platform = $state(getResolvedUiTheme());
  onMount(() => onUiThemeChange((t) => (platform = t)));
</script>

{#if platform === 'win'}
  <fluent-checkbox {id} checked={internal} onchange={onChange}>{label}</fluent-checkbox>
{:else if platform === 'mac'}
  <label class="p-form-checkbox-cont">
    <input {id} type="checkbox" checked={internal} onchange={onChange} />
    <span>{label}</span>
  </label>
{:else}
  <label class="inline-flex items-center gap-2">
    <input {id} type="checkbox" class="tw-checkbox" checked={internal} onchange={onChange} />
    <span>{label}</span>
  </label>
{/if}

<style></style>
