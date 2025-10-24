<script lang="ts">
  // Main renderer surface. All backend access goes through a minimal bridge
  // attached at window.aideon and exposed via preload/Tauri.
  // No backend‑specific logic or HTTP calls are allowed in the renderer.
  import { onMount } from 'svelte';
  // Use native window decorations; custom titlebars are disabled for main.
  import './theme.css';
  import { info, error } from '@tauri-apps/plugin-log';
  // no Tauri calls from main during splash-based init
  import MainView from './components/MainView.svelte';
  import AboutPanel from './components/AboutPanel.svelte';
  import Toolbar from './components/Toolbar.svelte';
  import StatusBar from './components/StatusBar.svelte';
  import Sidebar from './components/Sidebar.svelte';

  type WorkerState = {
    asOf: string;
    scenario: string | null;
    confidence: number | null;
    nodes: number;
    edges: number;
  };

  let version =
    (globalThis as unknown as { aideon?: { version?: string } }).aideon?.version ?? 'unknown';
  let stateAt: WorkerState | null = $state(null);
  let error_: string | null = $state(null);
  let seconds = $state(0); // simple uptime indicator
  let view: 'main' | 'about' = $state('main');
  let showSidebar = $state(true);
  let selectedId: string | null = $state(null);
  // previously used for overlay messages; retained as comment for future
  // reserved for future splash/internal rotation in main window

  let platform: 'mac' | 'win' | 'linux' | 'other' = $state('other');
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
    try {
      // With dedicated splash window, no frontend gating needed here
      const _bridge = (
        globalThis as unknown as {
          aideon?: {
            stateAt: (_args: {
              asOf: string;
              scenario?: string;
              confidence?: number;
            }) => Promise<WorkerState>;
          };
        }
      ).aideon;
      if (!_bridge || typeof _bridge.stateAt !== 'function')
        throw new Error('Bridge not available');
      // Request a trivial time‑slice to validate the bridge wiring.
      const result = await _bridge.stateAt({ asOf: '2025-01-01' });
      stateAt = result;
      info('renderer: init complete; stateAt received');
    } catch (error__) {
      error('renderer: stateAt failed', error__);
      error_ = String(error__);
    }
    clearInterval(timer);
    // no splash timers in main window
  });
  function onSelect(e: unknown) {
    const ev = e as { detail: { id: string } };
    selectedId = ev.detail.id;
  }
</script>

<!-- Native titlebars are used across platforms for the main window. -->
<div class="frame">
  <div class="row-top">
    <Toolbar
      sidebarActive={showSidebar}
      onToggleSidebar={() => (showSidebar = !showSidebar)}
      onOpenSettings={() => (globalThis as any).aideon.openSettings()}
      onOpenAbout={() => (globalThis as any).aideon.openAbout()}
      onOpenStatus={() => (globalThis as any).aideon.openStatus()}
    />
  </div>
  <div class="row-main">
    {#if showSidebar}
      <Sidebar
        on:select={onSelect}
        items={[
          {
            id: 'catalogues',
            label: 'Catalogues',
            children: [
              { id: 'applications', label: 'Applications' },
              { id: 'data', label: 'Data' },
            ],
          },
          { id: 'metamodel', label: 'Meta-model' },
          { id: 'visualisations', label: 'Visualisations' },
        ]}
      />
    {/if}
    <div class="content">
      {#if view === 'about'}
        <AboutPanel />
      {:else}
        <MainView {version} {stateAt} errorMsg={error_} />
        {#if selectedId}
          <div class="selection">Selected: {selectedId}</div>
        {/if}
      {/if}
    </div>
  </div>
  <div class="row-bottom">
    <StatusBar connected={!!stateAt && !error_} message={error_ ?? undefined} />
  </div>
</div>

{#if view === 'about'}
  <AboutPanel />
{:else}
  <MainView {version} {stateAt} errorMsg={error_} />
{/if}

<style>
  :global(:root) {
    --ink: #0b1220;
    --teal: #22e3d0;
    --vio: #7c5cff;
    --sun: #ff6a3d;
  }
  .frame {
    display: grid;
    grid-template-rows: auto 1fr auto;
    height: 100%;
  }
  .row-top {
    border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  }
  .row-main {
    display: grid;
    grid-template-columns: auto 1fr;
    min-height: 0;
  }
  .content {
    min-width: 0;
    overflow: auto;
    padding: 8px;
  }
  .row-bottom {
    border-top: 1px solid rgba(0, 0, 0, 0.06);
  }
  .selection {
    margin-top: 8px;
    opacity: 0.7;
  }
</style>
