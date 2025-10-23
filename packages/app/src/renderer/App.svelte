<script lang="ts">
  import { onMount } from 'svelte';
  import Titlebar from './Titlebar.svelte';
  import './theme.css';
  import { info, error } from '@tauri-apps/plugin-log';
  import { tauriInvoke } from '../tauri-invoke';
  import { Window } from '@tauri-apps/api/window';
  import SplashOverlay from './components/SplashOverlay.svelte';
  import MainView from './components/MainView.svelte';
  import AboutPanel from './components/AboutPanel.svelte';

  type WorkerState = {
    asOf: string;
    scenario: string | null;
    confidence: number | null;
    nodes: number;
    edges: number;
  };

  let version =
    (globalThis as unknown as { aideon?: { version?: string } }).aideon?.version ?? 'unknown';
  let stateAt: WorkerState | null = null;
  let error_: string | null = null;
  let showSplash = true;
  let seconds = 0;
  let view: 'main' | 'about' = 'main';
  const lines: string[] = [
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
  let loadIx = 0;
  $: loadline = lines[loadIx % lines.length];

  let platform: 'mac' | 'win' | 'linux' | 'other' = 'other';
  onMount(async () => {
    // Detect platform without @tauri-apps/api dependency to keep bundling simple
    const ua = navigator.userAgent;
    platform = /Macintosh|Mac OS X/.test(ua)
      ? 'mac'
      : /Windows/.test(ua)
        ? 'win'
        : /Linux/.test(ua)
          ? 'linux'
          : 'other';
    document.body.classList.add(`platform-${platform}`);
    if (platform === 'win') {
      // Register Fluent Web Components on Windows
      try {
        const { fluentButton, provideFluentDesignSystem } = await import(
          '@fluentui/web-components'
        );
        provideFluentDesignSystem().register(fluentButton());
      } catch {
        /* ignore */
      }
    }
    info('renderer: App.svelte mounting, starting init');
    const timer = setInterval(() => (seconds += 1), 1000);
    const rotator = setInterval(() => (loadIx += 1), 900);
    try {
      // front-end heavy setup simulation
      await new Promise((r) => setTimeout(r, 3000));
      await tauriInvoke('set_complete', { task: 'frontend' });
      // wait for backend readiness
      for (;;) {
        try {
          const s = await tauriInvoke<{ frontend: boolean; backend: boolean }>('get_setup_state');
          if (s.backend) break;
        } catch {}
        await new Promise((r) => setTimeout(r, 250));
      }
      showSplash = false;
      try {
        Window.getCurrent().show();
      } catch {}
      const bridge = (
        globalThis as unknown as {
          aideon?: {
            stateAt: (args: {
              asOf: string;
              scenario?: string;
              confidence?: number;
            }) => Promise<WorkerState>;
          };
        }
      ).aideon;
      if (!bridge || typeof bridge.stateAt !== 'function') throw new Error('Bridge not available');
      const result = await bridge.stateAt({ asOf: '2025-01-01' });
      stateAt = result;
      info('renderer: init complete; stateAt received');
    } catch (e) {
      error('renderer: stateAt failed', e);
      error_ = String(e);
    }
    clearInterval(timer);
    clearInterval(rotator);
  });
</script>

{#if platform !== 'win'}
  <Titlebar title="Aideon Praxis" {platform} />
{/if}
<nav style="position:absolute; right:12px; top:8px; z-index:10; display:flex; gap:12px;">
  <button on:click={() => (view = 'main')}>Main</button>
  <button on:click={() => (view = 'about')}>About</button>
</nav>

{#if view === 'about'}
  <AboutPanel />
{:else}
  <MainView {version} stateAt={stateAt} errorMsg={error_} />
{/if}
<SplashOverlay visible={showSplash} {seconds} line={loadline} />

<style>
  :global(:root) {
    --ink: #0b1220;
    --teal: #22e3d0;
    --vio: #7c5cff;
    --sun: #ff6a3d;
  }
</style>
