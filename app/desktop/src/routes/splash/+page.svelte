<script lang="ts">
  import { invoke } from '@tauri-apps/api/core';
  import { info } from '@tauri-apps/plugin-log';
  import { onDestroy, onMount } from 'svelte';

  const lines = [
    'Reticulating splines…',
    'Weaving twin orbits…',
    'Replaying future states…',
    'Cooling hot paths…',
    'Aligning decision matrices…',
    'Seeding knowledge graph…',
    'Collapsing branches to present…',
    'Normalising capability models…',
    'Hardening isolation layer…',
    'Bootstrapping sidecar…',
    'Calibrating maturity plateaus…',
    'Scheduling time-dimension renders…',
  ];

  let current = lines[0];
  let timer: ReturnType<typeof setTimeout> | null = null;

  function rotateLoadline() {
    let ix = 0;
    const tick = () => {
      current = lines[ix % lines.length] ?? '';
      ix += 1;
      timer = setTimeout(tick, 800);
    };
    timer = setTimeout(tick, 900);
  }

  async function init() {
    await info('splash: frontend init start');
    await new Promise((resolve) => setTimeout(resolve, 3000));
    await info('splash: frontend init complete');
    await invoke('set_complete', { task: 'frontend' });
  }

  onMount(() => {
    rotateLoadline();
    init().catch((error) => {
      if (import.meta.env.DEV) {
        globalThis.console.warn?.('splash: init failed', error);
      }
    });
  });

  onDestroy(() => {
    if (timer) clearTimeout(timer);
  });
</script>

<div class="splash">
  <div class="logo">Aideon Praxis</div>
  <div id="loadline" class="loadline">{current}</div>
</div>

<style>
  .splash {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100vh;
    gap: 12px;
    font-family: 'Atomic Age', sans-serif;
  }
  .logo {
    font-size: 2rem;
    letter-spacing: 0.08em;
  }
  .loadline {
    font-size: 1rem;
    opacity: 0.8;
  }
</style>
