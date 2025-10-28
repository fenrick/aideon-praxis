<script lang="ts">
  import { onMount } from 'svelte';
  import { getResolvedUiTheme, onUiThemeChange } from '$lib/theme/platform';
  import type { Snippet } from 'svelte';
  type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
  type Size = 'sm' | 'md' | 'lg';
  let {
    variant = 'secondary',
    size = 'md',
    disabled = false,
    type = 'button',
    children,
    end,
    badge,
    onClick,
  } = $props<{
    variant?: Variant;
    size?: Size;
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
    children?: Snippet;
    end?: Snippet;
    badge?: Snippet;
    onClick?: () => void;
  }>();
  let platform = $state(getResolvedUiTheme());
  onMount(() => onUiThemeChange((t) => (platform = t)));

  function fluentAppearance(v: Variant): 'accent' | 'neutral' | 'outline' | 'stealth' {
    if (v === 'primary') return 'accent';
    if (v === 'ghost') return 'stealth';
    if (v === 'secondary') return 'neutral';
    return 'accent';
  }
  function macClasses(v: Variant) {
    return `p-btn ${v === 'primary' ? 'p-prim-col' : v === 'ghost' ? 'p-btn-outline' : v === 'danger' ? 'p-btn-destructive' : ''}`.trim();
  }
  function neutralClasses(v: Variant, s: Size) {
    const base = v === 'primary' ? 'btn-neutral-primary' : 'btn-neutral';
    const sz = s === 'sm' ? 'tw-sm' : s === 'lg' ? 'tw-lg' : '';
    return `${base} ${sz}`.trim();
  }
</script>

{#if platform === 'win'}
  <fluent-button
    role="button"
    tabindex="0"
    appearance={fluentAppearance(variant)}
    {disabled}
    onclick={onClick}
    onkeydown={(ev: unknown) => {
      const key = (ev as any)?.key;
      if (key === 'Enter' || key === ' ') onClick?.();
    }}
  >
    {@render children?.()}{@render end?.()}{@render badge?.()}
  </fluent-button>
{:else if platform === 'mac'}
  <button class={macClasses(variant)} {disabled} {type} onclick={onClick}>
    {@render children?.()}{@render end?.()}{@render badge?.()}
  </button>
{:else}
  <button class={neutralClasses(variant, size)} {disabled} {type} onclick={onClick}>
    {@render children?.()}{@render end?.()}{@render badge?.()}
  </button>
{/if}

<style></style>
