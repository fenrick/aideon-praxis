<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { getResolvedUiTheme, onUiThemeChange } from '$lib/theme/platform';
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
    const next = Boolean((e.currentTarget as any)?.checked ?? !internal);
    internal = next;
    dispatch('change', internal ? value : null);
  }
  let platform = $state(getResolvedUiTheme());
  onMount(() => onUiThemeChange((t) => (platform = t)));
</script>

{#if platform === 'win'}
  <fluent-radio {name} {id} checked={internal} onchange={onChange}>{label}</fluent-radio>
{:else if platform === 'mac'}
  <label class="p-form-radio-cont">
    <input type="radio" {id} {name} {value} checked={internal} onchange={onChange} />
    <span>{label}</span>
  </label>
{:else}
  <label class="inline-flex items-center gap-2">
    <input type="radio" {id} {name} {value} checked={internal} onchange={onChange} />
    <span>{label}</span>
  </label>
{/if}

<style></style>
