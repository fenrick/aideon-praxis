<script lang="ts">
  const {
    open = false,
    title = '',
    onClose,
  } = $props<{
    open?: boolean;
    title?: string;
    onClose?: () => void;
  }>();

  function requestClose() {
    try {
      onClose?.();
    } catch {}
  }

  let dialogEl = $state<any | null>(null);

  // Basic focus trap when modal opens
  $effect.pre(() => {
    if (!open) return;
    const previous = document.activeElement as any;
    const focusable = (dialogEl?.querySelector as any)?.(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    focusable?.focus();
    return () => previous?.focus();
  });

  function onBackdrop(e: any) {
    if (e.target === e.currentTarget) requestClose();
  }

  function onKey(e: any) {
    if (e.key === 'Escape') requestClose();
  }
</script>

{#if open}
  <div class="backdrop" role="presentation" onclick={onBackdrop} onkeydown={onKey}>
    <div class="dialog" role="dialog" aria-modal="true" aria-label={title} bind:this={dialogEl}>
      <header class="header">
        <h3>{title}</h3>
        <button class="close" aria-label="Close" onclick={requestClose}>×</button>
      </header>
      <section class="body">
        <slot />
      </section>
      <footer class="footer">
        <slot name="footer" />
      </footer>
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: color-mix(in srgb, var(--color-text) 40%, transparent);
    display: grid;
    place-items: center;
    z-index: 1000;
  }
  .dialog {
    width: min(720px, calc(100vw - 2 * var(--space-6)));
    max-height: calc(100vh - 2 * var(--space-6));
    background: var(--color-bg);
    color: var(--color-text);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-2);
    box-shadow: var(--shadow-2);
    display: grid;
    grid-template-rows: auto 1fr auto;
  }
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-3) var(--space-4);
    border-bottom: 1px solid var(--color-border);
  }
  .body {
    padding: var(--space-4);
    overflow: auto;
  }
  .footer {
    padding: var(--space-3) var(--space-4);
    border-top: 1px solid var(--color-border);
    display: flex;
    gap: var(--space-2);
    justify-content: end;
  }
  .close {
    width: 28px;
    height: 28px;
    border-radius: var(--radius-1);
    border: 1px solid color-mix(in srgb, currentColor 20%, transparent);
    background: transparent;
  }
</style>
