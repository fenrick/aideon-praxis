<script lang="ts">
  import Icon from '@iconify/svelte';
  import { onMount } from 'svelte';
  import { getResolvedUiTheme, onUiThemeChange } from '../theme/platform';
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
  let platform = $state(getResolvedUiTheme());
  onMount(() => onUiThemeChange((t) => (platform = t)));
  function fluentAppearance(p: boolean) {
    return p ? 'neutral' : 'stealth';
  }
</script>

{#if platform === 'win'}
  <fluent-button
    role="button"
    tabindex="0"
    {title}
    appearance={fluentAppearance(pressed)}
    aria-pressed={pressed}
    onclick={onClick}
    onkeydown={(ev: unknown) => {
      const key = (ev as any)?.key;
      if (key === 'Enter' || key === ' ') onClick?.();
    }}
  >
    <Icon {icon} width="18" height="18" />
  </fluent-button>
{:else if platform === 'mac'}
  <button class="p-btn p-btn-icon" aria-pressed={pressed} {title} onclick={onClick}>
    <Icon {icon} width="18" height="18" />
  </button>
{:else}
  <button
    class="inline-flex h-[28px] w-[30px] items-center justify-center rounded border border-transparent text-[color:var(--color-text)] hover:bg-[color-mix(in_srgb,_var(--color-border)_25%,_transparent)]"
    aria-pressed={pressed}
    {title}
    onclick={onClick}
  >
    <Icon {icon} width="18" height="18" />
  </button>
{/if}

<style></style>
