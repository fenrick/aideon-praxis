<script lang="ts">
  const { text = '' } = $props<{ text?: string }>();
  let open = $state(false);
</script>

<span
  class="tip-wrap"
  role="button"
  tabindex="0"
  onmouseenter={() => (open = true)}
  onmouseleave={() => (open = false)}
  onfocus={() => (open = true)}
  onblur={() => (open = false)}
>
  <slot />
  {#if open && text}
    <span class="tip" role="tooltip">{text}</span>
  {/if}
</span>

<style>
  .tip-wrap {
    position: relative;
    display: inline-block;
  }
  .tip {
    position: absolute;
    bottom: calc(100% + 6px);
    left: 50%;
    transform: translateX(-50%);
    white-space: nowrap;
    background: var(--color-text);
    color: var(--color-bg);
    font-size: 12px;
    padding: 4px 8px;
    border-radius: 6px;
    box-shadow: var(--shadow-2);
  }
</style>
