<script lang="ts">
  import Field from './Field.svelte';
  import { createEventDispatcher, onMount } from 'svelte';
  import { getResolvedUiTheme, onUiThemeChange } from '../theme/platform';
  const {
    id,
    label,
    value = '',
    placeholder = '',
    required = false,
    help,
    error,
    type = 'text',
  } = $props<{
    id: string;
    label: string;
    value?: string;
    placeholder?: string;
    required?: boolean;
    help?: string;
    error?: string;
    type?: 'text' | 'email' | 'url' | 'password' | 'search';
  }>();

  const dispatch = createEventDispatcher<{ change: string }>();
  let internal = $state(value);
  $effect(() => (internal = value));
  function onInput(e: any) {
    internal = e.currentTarget?.value ?? '';
    dispatch('change', internal);
  }

  let platform = $state(getResolvedUiTheme());
  onMount(() => onUiThemeChange((t) => (platform = t)));
</script>

<Field {label} {help} {error} {required} forId={id}>
  {#if platform === 'win'}
    <fluent-text-field {id} {placeholder} {required} {type} value={internal} oninput={onInput}>
    </fluent-text-field>
  {:else if platform === 'mac'}
    <input
      {id}
      class="p-form-text"
      {placeholder}
      {required}
      {type}
      value={internal}
      oninput={onInput}
    />
  {:else}
    <input
      {id}
      class="tw-input"
      {placeholder}
      {required}
      {type}
      value={internal}
      oninput={onInput}
    />
  {/if}
</Field>

<style></style>
