<script lang="ts">
  import Icon from '@iconify/svelte';
  const {
    icon,
    title,
    pressed = false,
    onClick,
  } = $props<{
    icon: string;
    title: string;
    pressed?: boolean;
    onClick: () => void;
  }>();
</script>

<button class="tb" aria-pressed={pressed} {title} onclick={onClick}>
  <Icon {icon} width="18" height="18" />
  <span class="focus-ring"></span>
</button>

<style>
  .tb {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 28px;
    border-radius: var(--radius-1);
    border: 1px solid transparent;
    background: transparent;
    color: var(--color-text);
  }
  .tb[aria-pressed='true'] {
    border-color: var(--color-border);
    background: var(--color-bg);
    box-shadow: var(--shadow-1);
  }
  .tb:focus-visible {
    outline: none;
  }
  .tb .focus-ring {
    position: absolute;
    inset: -3px;
    border: 2px solid color-mix(in srgb, var(--color-accent) 70%, transparent);
    border-radius: calc(var(--radius-1) + 2px);
    opacity: 0;
  }
  .tb:focus-visible .focus-ring {
    opacity: 1;
  }
</style>
