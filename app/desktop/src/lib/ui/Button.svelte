<script lang="ts">
  type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
  type Size = 'sm' | 'md' | 'lg';
  const {
    variant = 'secondary',
    size = 'md',
    disabled = false,
    type = 'button',
  } = $props<{
    variant?: Variant;
    size?: Size;
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
  }>();
</script>

<button class={'btn ' + variant + ' ' + size} {disabled} {type}>
  <span class="content"><slot /></span>
  <slot name="end"></slot>
  <slot name="badge"></slot>
  <span class="focus-ring"></span>
</button>

<style>
  .btn {
    --h: 32px;
    height: var(--h);
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    border-radius: var(--radius-1);
    border: 1px solid var(--color-border);
    background: var(--color-bg);
    color: var(--color-text);
    padding: 0 var(--space-3);
    box-shadow: none;
  }
  .btn.sm {
    --h: 28px;
    padding: 0 var(--space-2);
  }
  .btn.lg {
    --h: 40px;
    padding: 0 var(--space-4);
  }

  .btn.primary {
    background: var(--color-accent);
    border-color: color-mix(in srgb, var(--color-accent) 60%, var(--color-border));
    color: #fff;
  }
  .btn.danger {
    background: color-mix(in srgb, var(--color-danger) 90%, #0000);
    border-color: color-mix(in srgb, var(--color-danger) 60%, var(--color-border));
    color: #fff;
  }
  .btn.ghost {
    background: transparent;
  }
  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn:focus-visible {
    outline: none;
    position: relative;
  }
  .btn .focus-ring {
    pointer-events: none;
    position: absolute;
    inset: -3px;
    border-radius: calc(var(--radius-1) + 2px);
    border: 2px solid color-mix(in srgb, var(--color-accent) 70%, transparent);
    opacity: 0;
  }
  .btn:focus-visible .focus-ring {
    opacity: 1;
  }
</style>
