<script lang="ts">
  import { onMount } from 'svelte';
  import { debug, error, info, logSafely } from '$lib/logging';
  import AboutPanel from '$lib/components/AboutPanel.svelte';
  import MainView from '$lib/components/MainView.svelte';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import StatusBar from '$lib/components/StatusBar.svelte';
  import Toolbar from '$lib/components/Toolbar.svelte';
  import type { AideonApi, StateAtResult, WorkerHealth } from '$lib/types';

  let version =
    (globalThis as unknown as { aideon?: { version?: string } }).aideon?.version ?? 'unknown';
  let stateAt: StateAtResult | null = $state(null);
  let error_: string | null = $state(null);
  let workerHealth = $state<WorkerHealth | null>(null);
  let healthError = $state<string | null>(null);
  let seconds = $state(0);
  let view = $state<'main' | 'about'>('main');
  let showSidebar = $state(true);
  let selectedId: string | null = $state(null);
  import { initUiTheme } from '$lib/theme/platform';

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
      let bridge = (globalThis as unknown as { aideon?: AideonApi }).aideon;
      if (bridge?.stateAt === undefined) {
        logSafely(debug, 'renderer: aideon bridge missing; importing tauri-shim');
        await import('$lib/tauri-shim');
        bridge = (globalThis as unknown as { aideon?: AideonApi }).aideon;
      }
      if (!bridge || typeof bridge.stateAt !== 'function') {
        throw new TypeError('Bridge not available');
      }
      stateAt = await bridge.stateAt({ asOf: '2025-01-01' });
      const counts = stateAt
        ? ` nodes=${stateAt.nodes} edges=${stateAt.edges}`
        : ' nodes=0 edges=0';
      logSafely(info, `renderer: stateAt received${counts}`);

      if (typeof bridge.workerHealth === 'function') {
        try {
          workerHealth = await bridge.workerHealth();
          logSafely(
            info,
            `renderer: worker health ok=${workerHealth.ok} timestamp=${workerHealth.timestampMs}`,
          );
        } catch (error__) {
          const message =
            error__ instanceof Error
              ? error__.message
              : typeof error__ === 'string'
                ? error__
                : 'worker health failed';
          healthError = message;
          logSafely(error, `renderer: worker_health failed — ${message}`);
        }
      } else {
        healthError = 'Worker health unavailable';
        logSafely(debug, 'renderer: workerHealth bridge method missing');
      }
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
