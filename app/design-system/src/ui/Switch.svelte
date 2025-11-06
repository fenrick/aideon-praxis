<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { getResolvedUiTheme, onUiThemeChange } from '../theme/platform';
  const {
    id,
    checked = false,
    label,
  } = $props<{ id: string; checked?: boolean; label?: string }>();
  const dispatch = createEventDispatcher<{ change: boolean }>();
  let internal = $state(checked);
  $effect(() => (internal = checked));
  function onChange(e: any) {
    const next = (e.currentTarget as any)?.checked ?? !internal;
    internal = Boolean(next);
    dispatch('change', internal);
  }
  let platform = $state(getResolvedUiTheme());
  onMount(() => onUiThemeChange((t) => (platform = t)));
</script>

{#if platform === 'win'}
  <fluent-switch {id} checked={internal} onchange={onChange}>{label}</fluent-switch>
{:else if platform === 'mac'}
  <label class="p-form-checkbox-cont">
    <input {id} type="checkbox" role="switch" checked={internal} onchange={onChange} />
    <span>{label}</span>
  </label>
{:else}
  <label class="inline-flex items-center gap-2">
    <input
      {id}
      type="checkbox"
      role="switch"
      class="tw-checkbox"
      checked={internal}
      onchange={onChange}
    />
    <span>{label}</span>
  </label>
{/if}

<style></style>
