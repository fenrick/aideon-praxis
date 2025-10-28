<script lang="ts">
  import '../../lib/styles/theme.css';
  import Tokens from './tokens.svelte';
  import Components from './components.svelte';
  const platforms = ['auto', 'mac', 'win', 'linux'] as const;
  type Platform = (typeof platforms)[number];
  let platform = $state<Platform>('auto');
  $effect.pre(() => {
    const saved = localStorage.getItem('aideon.platform') as Platform | null;
    platform = saved ?? 'auto';
    applyPlatform();
  });
  function applyPlatform() {
    const root = document.documentElement;
    root.classList.remove('platform-mac', 'platform-win', 'platform-linux');
    switch (platform) {
      case 'mac': {
        root.classList.add('platform-mac');
        break;
      }
      case 'win': {
        root.classList.add('platform-win');
        break;
      }
      case 'linux': {
        {
          root.classList.add('platform-linux');
          // No default
        }
        break;
      }
    }
  }
  function onPlatformChange(value: Platform) {
    platform = value;
    localStorage.setItem('aideon.platform', platform);
    applyPlatform();
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
