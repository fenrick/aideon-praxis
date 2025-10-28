<script lang="ts">
  import '../../lib/styles/theme.css';
  import Tokens from './tokens.svelte';
  import Components from './components.svelte';
  import OSPreview from './OSPreview.svelte';
  import { initUiTheme, setUiTheme } from '$lib/theme/platform';
  import { onMount } from 'svelte';
  const platforms = ['auto', 'mac', 'win', 'neutral'] as const;
  type Platform = (typeof platforms)[number];
  let platform = $state<Platform>('auto');
  $effect.pre(() => {
    const saved = (localStorage.getItem('aideon.platform') as Platform | null) ?? 'auto';
    platform = saved;
  });
  onMount(() => {
    void initUiTheme();
  });
  async function onPlatformChange(value: Platform) {
    platform = value;
    await setUiTheme(platform);
  }
</script>

<div class="sg">
  <h1>Style Guide</h1>
  <div class="platform">
    <div>Platform:</div>
    {#each platforms as p (p)}
      <label
        ><input
          type="radio"
          name="pf"
          checked={platform === p}
          onchange={() => onPlatformChange(p)}
        />
        {p}</label
      >
    {/each}
  </div>
  <Tokens />
  <OSPreview />
  <Components />
</div>

<style>
  .sg {
    padding: var(--space-4);
    display: grid;
    gap: var(--space-6);
  }
  h1 {
    margin: 0;
  }
  .platform {
    display: flex;
    gap: var(--space-4);
    align-items: center;
  }
  .platform label {
    display: inline-flex;
    gap: 6px;
    align-items: center;
  }
</style>
