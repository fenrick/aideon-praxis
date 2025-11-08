<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';
  import { get } from 'svelte/store';
  import { debug, error, info, logSafely } from '$lib/logging';
  import { initUiTheme } from '@aideon/design-system';
  import AboutPanel from '$lib/components/AboutPanel.svelte';
  import MainView from '$lib/components/MainView.svelte';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import StatusBar from '$lib/components/StatusBar.svelte';
  import Toolbar from '$lib/components/Toolbar.svelte';
  import type { StateAtResult, WorkerHealth } from '$lib/types';
  import type { TimeStoreState } from '$lib/stores/time';
  import { timeStore } from '$lib/stores/time';
  import { searchStore, type CatalogEntitySummary } from '$lib/stores/search';
  import { version as appVersion } from '../version.js';

  let version = $state(appVersion);
  let stateAt: StateAtResult | null = $state(null);
  let timeState: TimeStoreState | null = $state(null);
  let error_: string | null = $state(null);
  let workerHealth = $state<WorkerHealth | null>(null);
  let healthError = $state<string | null>(null);
  let seconds = $state(0);
  let view = $state<'main' | 'about'>('main');
  let showSidebar = $state(true);
  let selectedId: string | null = $state('overview');
  let workspaceTab = $state<'overview' | 'timeline' | 'canvas' | 'activity'>('overview');

  const numberFormatter = new Intl.NumberFormat();

  const sidebarItems = [
    {
      id: 'workspace',
      label: 'Workspace',
      children: [
        { id: 'overview', label: 'Overview' },
        { id: 'timeline', label: 'Timeline' },
        { id: 'canvas', label: 'Canvas' },
        { id: 'activity', label: 'Activity' },
      ],
    },
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
    { id: 'about', label: 'About Praxis' },
  ];

  const catalogEntities: CatalogEntitySummary[] = [
    {
      id: 'catalog-applications',
      name: 'Applications Catalogue',
      type: 'Catalogue',
      description: 'Inventory of application services and owners',
      sidebarId: 'applications',
    },
    {
      id: 'catalog-data',
      name: 'Data Catalogue',
      type: 'Catalogue',
      description: 'Pipelines and data domains across the estate',
      sidebarId: 'data',
    },
    {
      id: 'catalog-metamodel',
      name: 'Praxis Meta-model',
      type: 'Reference',
      description: 'Schema reference for temporal state snapshots',
      sidebarId: 'metamodel',
    },
  ];

  const workspaceViews = new Set(['overview', 'timeline', 'canvas', 'activity']);

  function selectSidebarItem(id: string) {
    selectedId = id;
    if (id === 'about') {
      view = 'about';
    } else {
      view = 'main';
      if (workspaceViews.has(id)) {
        workspaceTab = id as typeof workspaceTab;
      }
    }
    logSafely(debug, `renderer: sidebar selection id=${selectedId}`);
  }

  async function openSidebarFromSearch(id: string) {
    selectSidebarItem(id);
    showSidebar = true;
  }

  async function openCatalogEntityFromSearch(entity: CatalogEntitySummary) {
    if (entity.sidebarId) {
      selectSidebarItem(entity.sidebarId);
      showSidebar = true;
    } else {
      view = 'main';
    }
    logSafely(debug, `renderer: search open catalog id=${entity.id}`);
  }

  const toolbarBranch = $derived(() => timeState?.branch ?? 'main');
  const toolbarUnsaved = $derived(() => timeState?.unsavedCount ?? 0);
  const statusDetails = $derived(() => {
    const branchValue = toolbarBranch();
    const base = branchValue ? [{ label: 'Branch', value: branchValue.toUpperCase() }] : [];
    if (!stateAt) {
      return base;
    }
    return [
      ...base,
      { label: 'Snapshot', value: stateAt.asOf },
      { label: 'Nodes', value: numberFormatter.format(stateAt.nodes) },
      { label: 'Edges', value: numberFormatter.format(stateAt.edges) },
    ];
  });

  async function handleBranchSelect(branch: string) {
    await timeStore.loadBranch(branch);
  }

  async function handleCommitSelect(commitId: string | null) {
    await timeStore.selectCommit(commitId);
  }

  async function handleMerge(source: string, target: string) {
    await timeStore.mergeBranches(source, target);
  }

  function handleRefreshBranches() {
    timeStore.refreshBranches().catch((error__) => {
      const message =
        error__ instanceof Error
          ? error__.message
          : typeof error__ === 'string'
            ? error__
            : 'refresh branches failed';
      logSafely(error, `renderer: refreshBranches failed — ${message}`);
    });
  }

  async function openCommitFromSearch(commitId: string) {
    await handleCommitSelect(commitId);
    view = 'main';
    workspaceTab = 'timeline';
    selectedId = 'timeline';
    showSidebar = true;
    logSafely(debug, `renderer: search open commit id=${commitId}`);
  }

  searchStore.setSidebarItems(sidebarItems, openSidebarFromSearch);
  searchStore.setCatalogEntities(catalogEntities, openCatalogEntityFromSearch);

  const unsubscribeTime = timeStore.subscribe((value) => {
    timeState = value;
    stateAt = value.snapshot;
    error_ = value.error;
    searchStore.setRecentCommits(value.commits, openCommitFromSearch);
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
    selectSidebarItem(event.detail.id);
  }
</script>

<div class="app-shell">
  <Toolbar
    {version}
    branch={toolbarBranch()}
    unsavedCount={toolbarUnsaved()}
    sidebarActive={showSidebar}
    onToggleSidebar={() => (showSidebar = !showSidebar)}
    onOpenSettings={() => void openWindow('open_settings')}
    onOpenAbout={() => void openWindow('open_about')}
    onOpenStatus={() => void openWindow('open_status')}
  />
  <div class="shell-body">
    {#if showSidebar}
      <Sidebar on:select={onSelect} items={sidebarItems} activeId={selectedId} />
    {/if}
    <div class="workspace-area">
      <div class="view-toggle" role="tablist">
        <button
          class={view === 'main' ? 'toggle active' : 'toggle'}
          role="tab"
          aria-selected={view === 'main'}
          onclick={() => {
            view = 'main';
            selectedId = workspaceTab;
          }}
        >
          Workspace
        </button>
        <button
          class={view === 'about' ? 'toggle active' : 'toggle'}
          role="tab"
          aria-selected={view === 'about'}
          onclick={() => {
            view = 'about';
            selectedId = 'about';
          }}
        >
          About
        </button>
      </div>
      {#if view === 'about'}
        <AboutPanel />
      {:else}
        <MainView
          {version}
          {stateAt}
          errorMsg={error_}
          {timeState}
          focusTab={workspaceTab}
          on:tabChange={(event) => {
            workspaceTab = event.detail;
            selectedId = event.detail;
          }}
          onSelectBranch={handleBranchSelect}
          onSelectCommit={handleCommitSelect}
          onMerge={handleMerge}
          onRefreshBranches={handleRefreshBranches}
        />
      {/if}
    </div>
  </div>
  <StatusBar
    connected={workerHealth?.ok ?? (!!stateAt && !error_)}
    message={workerHealth?.message ?? healthError ?? error_ ?? undefined}
    details={statusDetails()}
  />
</div>

<style>
  .app-shell {
    display: grid;
    grid-template-rows: auto 1fr auto;
    height: 100%;
    background:
      radial-gradient(at 20% 20%, rgba(59, 130, 246, 0.08), transparent 45%),
      radial-gradient(at 80% 0%, rgba(124, 58, 237, 0.08), transparent 50%),
      linear-gradient(180deg, #f9faff 0%, #f2f4ff 40%, #eef1ff 100%);
  }

  .shell-body {
    display: grid;
    grid-template-columns: auto 1fr;
    min-height: 0;
    overflow: hidden;
  }

  .workspace-area {
    min-width: 0;
    overflow: auto;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .view-toggle {
    display: inline-flex;
    gap: 8px;
    padding: 12px 24px 0;
  }

  .toggle {
    border: 1px solid rgba(15, 23, 42, 0.1);
    background: rgba(255, 255, 255, 0.65);
    color: rgba(15, 23, 42, 0.75);
    border-radius: 999px;
    padding: 6px 16px;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.18s ease;
  }

  .toggle.active {
    background: rgba(59, 130, 246, 0.2);
    color: rgba(30, 64, 175, 0.95);
    border-color: rgba(59, 130, 246, 0.35);
    box-shadow: 0 12px 20px -18px rgba(59, 130, 246, 0.65);
  }

  @media (max-width: 1024px) {
    .shell-body {
      grid-template-columns: minmax(0, 1fr);
    }
    .view-toggle {
      padding-left: 16px;
    }
  }
</style>
