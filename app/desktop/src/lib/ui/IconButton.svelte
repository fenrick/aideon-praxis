<script lang="ts">
  import Icon from '@iconify/svelte';
  const {
    iconRegular,
    iconFilled,
    active = false,
    title,
    onClick,
  } = $props<{
    iconRegular: string;
    iconFilled: string;
    active?: boolean;
    title: string;
    onClick: () => void;
  }>();
</script>

<button class="icon-btn" aria-pressed={active} {title} onclick={onClick}>
  <Icon icon={active ? iconFilled : iconRegular} width="22" height="22" />
</button>

<style>
  .icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 30px;
    border-radius: 8px;
    border: 1px solid color-mix(in srgb, currentColor 18%, transparent);
    background: color-mix(in srgb, currentColor 4%, transparent);
    color: currentColor;
  }
  .icon-btn[aria-pressed='true'] {
    color: var(--accent);
    border-color: color-mix(in srgb, var(--accent) 30%, transparent);
    background: color-mix(in srgb, var(--accent) 10%, transparent);
  }
  .icon-btn:hover {
    filter: brightness(0.98);
  }
  :global(.iconify) {
    display: block;
  }
</style>
