<script lang="ts">
  import { dismiss, subscribe, type ToastItem } from './toast';
  let list: ToastItem[] = [];
  $effect(() => subscribe((items) => (list = items)));
</script>

<div class="toast-host" aria-live="polite" aria-atomic="true">
  {#each list as t (t.id)}
    <button class={'toast ' + t.variant} onclick={() => dismiss(t.id)} aria-live="polite">
      {t.text}
    </button>
  {/each}
  <slot></slot>
</div>

<style>
  .toast-host {
    position: fixed;
    bottom: 16px;
    right: 16px;
    display: grid;
    gap: 8px;
    z-index: 10000;
  }
  .toast {
    padding: 8px 12px;
    border-radius: var(--radius-1);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    box-shadow: var(--shadow-2);
    cursor: pointer;
    color: var(--color-text);
  }
  .toast.success {
    border-color: color-mix(in srgb, var(--color-success) 40%, var(--color-border));
  }
  .toast.error {
    border-color: color-mix(in srgb, var(--color-danger) 40%, var(--color-border));
  }
  .toast.warning {
    border-color: color-mix(in srgb, #f59e0b 40%, var(--color-border));
  }
</style>
