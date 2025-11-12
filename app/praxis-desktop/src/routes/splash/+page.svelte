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
  <img class="bg" src="splash.png" alt="" />
  =
  <div class="right">
    <h1 class="title">Aideon&nbsp;Praxis</h1>
    <div class="loading">
      <span id="loadline">{current}</span>
      <div class="bar"><i></i></div>
    </div>
  </div>
</div>

<style>
  @font-face {
    font-family: 'Atomic Age';
    src: url('AtomicAge-Regular.ttf') format('truetype');
    font-weight: 400;
    font-style: normal;
    font-display: swap;
  }
  @font-face {
    font-family: 'Geist Mono';
    src: url('GeistMono-VariableFont_wght.ttf') format('truetype');
    font-weight: 400;
    font-style: normal;
    font-display: swap;
  }

  :root {
    --ink: #0b1220;
    --teal: #22e3d0;
    --vio: #7c5cff;
    --sun: #ff6a3d;
  }
  .splash {
    position: relative;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    background: #061428;
  }
  .bg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  /* removed unused .mark */
  .right {
    position: absolute;
    right: 5vw;
    top: 50%;
    transform: translateY(-50%);
    max-width: 42vw;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 10px 12px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
  }
  .title {
    font-family: 'Atomic Age', system-ui, sans-serif;
    font-size: clamp(26px, 5vw, 72px);
    letter-spacing: 0.012em;
    margin: 0 0 24px;
    background: linear-gradient(90deg, var(--teal), var(--vio), var(--sun));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    text-shadow: 0 0 18px rgba(11, 18, 32, 0.35);
  }
  .loading {
    font:
      600 12px/1.4 'Geist Mono',
      ui-monospace,
      SFMono-Regular,
      Menlo,
      monospace;
    color: #cfe6ff;
  }
  .bar {
    margin-top: 8px;
    height: 3px;
    background: rgba(255, 255, 255, 0.15);
    overflow: hidden;
    border-radius: 999px;
  }
  .bar i {
    display: block;
    width: 30%;
    height: 100%;
    background: linear-gradient(90deg, var(--teal), var(--sun));
    animation: scan 1.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
    border-radius: 999px;
  }
  @keyframes scan {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(400%);
    }
  }
</style>
