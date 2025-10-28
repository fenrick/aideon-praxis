<script lang="ts">
  const {
    label,
    help,
    error,
    required = false,
    forId,
  } = $props<{
    label: string;
    help?: string;
    error?: string;
    required?: boolean;
    forId?: string;
  }>();
</script>

<div class="field">
  <label class="label" for={forId}>
    {label}{required ? ' *' : ''}
  </label>
  <div class="control">
    <slot></slot>
  </div>
  {#if error}
    <div class="error" role="alert">{error}</div>
  {:else if help}
    <div class="help">{help}</div>
  {/if}
  <slot name="below"></slot>
  <span class="focus-ring"></span>
  <span class="border"></span>
  <span class="bg"></span>
  <span class="shadow"></span>
</div>

<style>
  .field {
    display: grid;
    gap: 6px;
    position: relative;
  }
  .label {
    color: var(--color-muted);
    font-size: 12px;
  }
  .control {
    display: block;
  }
  .help {
    color: var(--color-muted);
    font-size: 12px;
  }
  .error {
    color: var(--color-danger);
    font-size: 12px;
  }
</style>
