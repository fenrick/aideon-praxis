<script lang="ts">
  import Field from './Field.svelte';
  import { createEventDispatcher } from 'svelte';
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
  let internal = value;
  $effect(() => (internal = value));
  function onInput(e: any) {
    internal = e.currentTarget?.value ?? '';
    dispatch('change', internal);
  }
</script>

<Field {label} {help} {error} {required} forId={id}>
  <input {id} class="text" {placeholder} {required} {type} value={internal} oninput={onInput} />
</Field>

<style>
  .text {
    height: 32px;
    width: 100%;
    border-radius: var(--radius-1);
    border: 1px solid var(--color-border);
    background: var(--color-bg);
    color: var(--color-text);
    padding: 0 var(--space-3);
  }
  .text:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--color-accent) 70%, transparent);
    outline-offset: 1px;
  }
</style>
