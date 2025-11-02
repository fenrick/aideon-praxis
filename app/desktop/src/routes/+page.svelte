<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';
  import { get } from 'svelte/store';
  import { debug, error, info, logSafely } from '$lib/logging';
  import AboutPanel from '$lib/components/AboutPanel.svelte';
  import MainView from '$lib/components/MainView.svelte';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import StatusBar from '$lib/components/StatusBar.svelte';
  import Toolbar from '$lib/components/Toolbar.svelte';
  import type { StateAtResult, WorkerHealth } from '$lib/types';
import { timeStore } from '$lib/stores/time';
import { version as appVersion } from '../version.js';

  let version = $state(appVersion);
  let stateAt: StateAtResult | null = $state(null);
  let error_: string | null = $state(null);
  let workerHealth = $state<WorkerHealth | null>(null);
  let healthError = $state<string | null>(null);
  let seconds = $state(0);
  let view = $state<'main' | 'about'>('main');
  let showSidebar = $state(true);
  let selectedId: string | null = $state(null);
  import { initUiTheme } from '$lib/theme/platform';

  const unsubscribeTime = timeStore.subscribe((value) => {
    stateAt = value.snapshot;
    error_ = value.error;
  });

  let healthTimer: ReturnType<typeof setInterval> | null = null;

  async function refreshHealth() {
    try {
      const snapshot = await invoke<WorkerHealth>('worker_health');
      workerHealth = snapshot;
      healthError = null;
      logSafely(
        info,
        `renderer: worker health ok=${snapshot.ok} timestamp=${snapshot.timestampMs}`,
      );
    } catch (error__) {
      const message =
        error__ instanceof Error
          ? error__.message
          : typeof error__ === 'string'
            ? error__
            : 'worker health failed';
      healthError = message;
      workerHealth = null;
      logSafely(error, `renderer: worker_health failed — ${message}`);
    }
  }

  async function openWindow(command: 'open_settings' | 'open_about' | 'open_status') {
    try {
      await invoke(command);
    } catch (error__) {
      const message =
        error__ instanceof Error
          ? error__.message
          : typeof error__ === 'string'
            ? error__
            : 'window open failed';
      logSafely(error, `renderer: ${command} failed — ${message}`);
    }
  }

  onMount(async () => {
    await initUiTheme();

    logSafely(info, 'renderer: main window mounting');
    logSafely(info, 'renderer: starting initialization timer tick');
    const timer = setInterval(() => {
      seconds += 1;
      if (seconds % 5 === 0) {
        logSafely(debug, `renderer: initialization heartbeat second=${seconds}`);
      }
    }, 1000);
    try {
      await timeStore.loadBranch('main');
      const latestSnapshot = get(timeStore).snapshot;
      if (latestSnapshot) {
        const counts = ` nodes=${latestSnapshot.nodes} edges=${latestSnapshot.edges}`;
        logSafely(info, `renderer: stateAt received${counts}`);
      }

      await refreshHealth();
      healthTimer = setInterval(() => {
        void refreshHealth();
      }, 15_000);
    } catch (error__) {
      const message =
        error__ instanceof Error ? error__.message : typeof error__ === 'string' ? error__ : '';
      const suffix = message ? ` — ${message}` : '';
      logSafely(error, `renderer: stateAt failed${suffix}`);
      error_ = message || String(error__);
    } finally {
      clearInterval(timer);
      logSafely(info, 'renderer: initialization timer cleared');
    }
  });

  onDestroy(() => {
    if (healthTimer) {
      clearInterval(healthTimer);
    }
    unsubscribeTime();
  });

  function onSelect(event: { detail: { id: string } }) {
    selectedId = event.detail.id;
    logSafely(debug, `renderer: sidebar selection id=${selectedId}`);
  }
</script>

<div class="frame">
  <div class="row-top">
    <Toolbar
      sidebarActive={showSidebar}
      onToggleSidebar={() => (showSidebar = !showSidebar)}
      onOpenSettings={() => void openWindow('open_settings')}
      onOpenAbout={() => void openWindow('open_about')}
      onOpenStatus={() => void openWindow('open_status')}
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
    <StatusBar
      connected={workerHealth?.ok ?? (!!stateAt && !error_)}
      message={workerHealth?.message ?? healthError ?? error_ ?? undefined}
    />
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
