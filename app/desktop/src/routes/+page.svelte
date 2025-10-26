<script lang="ts">
  import { onMount } from 'svelte';
  import { info, error } from '@tauri-apps/plugin-log';
  import AboutPanel from '$lib/components/AboutPanel.svelte';
  import MainView from '$lib/components/MainView.svelte';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import StatusBar from '$lib/components/StatusBar.svelte';
  import Toolbar from '$lib/components/Toolbar.svelte';
  import type { StateAtResult } from '$lib/types';

  let version =
    (globalThis as unknown as { aideon?: { version?: string } }).aideon?.version ?? 'unknown';
  let stateAt: StateAtResult | null = $state(null);
  let error_: string | null = $state(null);
  let seconds = $state(0);
  let view: 'main' | 'about' = $state('main');
  let showSidebar = $state(true);
  let selectedId: string | null = $state(null);
  let platform: 'mac' | 'win' | 'linux' | 'other' = $state('other');

  onMount(async () => {
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
      try {
        const { fluentButton, provideFluentDesignSystem } = await import(
          '@fluentui/web-components'
        );
        provideFluentDesignSystem().register(fluentButton());
      } catch {
        /* noop: Fluent registration best-effort */
      }
    }

    info('renderer: main window mounting');
    const timer = setInterval(() => (seconds += 1), 1000);
    try {
      const bridge = (
        globalThis as unknown as {
          aideon?: {
            stateAt: (_args: {
              asOf: string;
              scenario?: string;
              confidence?: number;
            }) => Promise<StateAtResult>;
          };
        }
      ).aideon;
      if (!bridge || typeof bridge.stateAt !== 'function') {
        throw new Error('Bridge not available');
      }
      stateAt = await bridge.stateAt({ asOf: '2025-01-01' });
      info('renderer: init complete; stateAt received');
    } catch (error__) {
      error('renderer: stateAt failed', error__);
      error_ = String(error__);
    } finally {
      clearInterval(timer);
    }
  });

  function onSelect(event: { detail: { id: string } }) {
    selectedId = event.detail.id;
  }
</script>

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

<style>
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
