<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { debug, error as logError, info as logInfo, logSafely } from '$lib/logging';
  import Scene from '$lib/canvas/Scene.svelte';
  import { Button, Select, Tabs, type TabItem } from '@aideon/design-system';
  import type { TimeStoreState } from '$lib/stores/time';
  import type {
    TemporalBranchSummary,
    TemporalCommitSummary,
    TemporalDiffSnapshot,
    TemporalMergeConflict,
  } from '$lib/types';

  type WorkspaceTab = 'overview' | 'timeline' | 'canvas' | 'activity';

  const {
    version,
    stateAt,
    errorMsg,
    timeState,
    onSelectBranch,
    onSelectCommit,
    onMerge,
    onRefreshBranches,
    focusTab,
  } = $props<{
    version: string;
    stateAt: {
      asOf: string;
      scenario: string | null;
      confidence: number | null;
      nodes: number;
      edges: number;
    } | null;
    errorMsg: string | null;
    timeState: TimeStoreState | null;
    onSelectBranch?: (_branch: string) => void | Promise<void>;
    onSelectCommit?: (_commitId: string | null) => void | Promise<void>;
    onMerge?: (_source: string, _target: string) => void | Promise<void>;
    onRefreshBranches?: () => void;
    focusTab?: WorkspaceTab | null;
  }>();

  const numberFormatter = new Intl.NumberFormat();

  const dispatch = createEventDispatcher<{ tabChange: WorkspaceTab }>();

  // Locally tracked active workspace tab; defaults to the high-level overview.
  let activeTab = $state<WorkspaceTab>('overview');
  const tabItems = $state<TabItem[]>([
    { id: 'overview', title: 'Overview' },
    { id: 'timeline', title: 'Timeline' },
    { id: 'canvas', title: 'Canvas' },
    { id: 'activity', title: 'Activity' },
  ]);

  $effect(() => {
    logSafely(debug, `renderer: main view version=${version}`);
  });

  $effect(() => {
    if (!stateAt) {
      return;
    }
    logSafely(
      logInfo,
      `renderer: main view displaying snapshot commit=${stateAt.asOf} nodes=${stateAt.nodes} edges=${stateAt.edges}`,
    );
  });

  $effect(() => {
    if (!errorMsg) {
      return;
    }
    logSafely(logError, `renderer: main view error=${errorMsg}`);
  });

  $effect(() => {
    logSafely(debug, `renderer: workspace tab changed tab=${activeTab}`);
  });

  const branchOptions = $derived(() => {
    if (!timeState) {
      return [] as { value: string; label: string }[];
    }
    return timeState.branches.map((branch: TemporalBranchSummary) => ({
      value: branch.name,
      label: branch.name,
    }));
  });

  const commitOptions = $derived(() => {
    if (!timeState) {
      return [] as { value: string; label: string }[];
    }
    const commits = timeState.commits.map((commit: TemporalCommitSummary) => ({
      value: commit.id,
      label: `${commit.message} — ${commit.time ?? commit.id}`,
    }));
    return [{ value: '', label: 'Latest state' }, ...commits];
  });

  const diffMetrics = $derived(
    () => (timeState?.diff?.metrics ?? null) as TemporalDiffSnapshot['metrics'] | null,
  );
  const mergeConflicts = $derived(
    () => (timeState?.mergeConflicts ?? []) as TemporalMergeConflict[],
  );
  const timelineCommits = $derived(() => (timeState?.commits ?? []) as TemporalCommitSummary[]);
  const unsavedCount = $derived(() => timeState?.unsavedCount ?? 0);
  const activeBranch = $derived(() => timeState?.branch ?? 'main');

  const overviewStats = $derived(() => {
    if (!stateAt) {
      return [] as { label: string; value: string }[];
    }
    return [
      { label: 'Nodes', value: numberFormatter.format(stateAt.nodes) },
      { label: 'Edges', value: numberFormatter.format(stateAt.edges) },
      {
        label: 'Confidence',
        value:
          typeof stateAt.confidence === 'number'
            ? `${Math.round(stateAt.confidence * 100)}%`
            : 'Not set',
      },
      {
        label: 'Scenario',
        value: stateAt.scenario ?? 'Production',
      },
    ];
  });

  async function handleBranchChange(event: CustomEvent<string>) {
    const value = event.detail;
    if (!value) {
      return;
    }
    await onSelectBranch?.(value);
  }

  async function handleCommitChange(event: CustomEvent<string>) {
    const value = event.detail;
    await onSelectCommit?.(value || null);
  }

  async function handleMergeClick() {
    if (!timeState?.branch || timeState.branch === 'main') {
      return;
    }
    await onMerge?.(timeState.branch, 'main');
  }

  function handleRefreshBranches() {
    onRefreshBranches?.();
  }

  function handleTabSelect(id: string) {
    activeTab = id as WorkspaceTab;
    dispatch('tabChange', activeTab);
  }

  $effect(() => {
    if (focusTab && focusTab !== activeTab) {
      activeTab = focusTab;
    }
  });
</script>

<div class="workspace">
  <header class="workspace__header">
    <div>
      <h1>Aideon Praxis</h1>
      <p class="subtitle">Renderer bridge {version}</p>
    </div>
    <div class="header-meta">
      <span class="meta-pill" aria-live="polite">
        Branch · {activeBranch()}
      </span>
      {#if unsavedCount() > 0}
        <span class="meta-pill warning">Unsaved {unsavedCount()}</span>
      {/if}
    </div>
  </header>

  <section class="workspace__controls" aria-label="Branch and commit controls">
    {#if timeState}
      <Select
        id="branch-select"
        label="Branch"
        options={branchOptions()}
        value={timeState.branch}
        on:change={handleBranchChange}
        help="Switch between temporal work branches"
      />
      <Button variant="ghost" size="sm" onClick={handleRefreshBranches}>
        <iconify-icon icon="fluent:arrow-sync-16-regular" aria-hidden="true"></iconify-icon>
        <span>Refresh</span>
      </Button>
      <Select
        id="commit-select"
        label="Commit"
        options={commitOptions()}
        value={timeState.currentCommitId ?? ''}
        on:change={handleCommitChange}
        help="Preview snapshots at a point in time"
      />
      {#if timeState.branch !== 'main'}
        <Button variant="primary" size="sm" onClick={handleMergeClick}>
          <iconify-icon icon="fluent:branch-compare-20-regular" aria-hidden="true"></iconify-icon>
          <span>Merge into main</span>
        </Button>
      {/if}
    {:else}
      <p class="muted">Loading temporal branches…</p>
    {/if}
  </section>

  <Tabs tabs={tabItems} activeId={activeTab} onSelect={handleTabSelect} />

  <section class="workspace__body" aria-live="polite">
    {#if errorMsg}
      <div class="alert">
        <h2>Worker Error</h2>
        <p>{errorMsg}</p>
      </div>
    {:else if !stateAt}
      <div class="loading">Querying worker…</div>
    {:else if activeTab === 'overview'}
      {@const stats = overviewStats()}
      {@const metrics = diffMetrics()}
      {@const conflicts = mergeConflicts()}
      <div class="cards">
        <article class="card highlight">
          <header>
            <h3>Snapshot</h3>
            <span class="mono">{stateAt.asOf}</span>
          </header>
          <dl>
            {#each stats as stat (stat.label)}
              <div>
                <dt>{stat.label}</dt>
                <dd>{stat.value}</dd>
              </div>
            {/each}
          </dl>
        </article>
        {#if metrics}
          <article class="card">
            <header>
              <h3>Diff Metrics</h3>
              <span class="muted">vs. selected baseline</span>
            </header>
            <ul class="metric-list">
              <li>
                <span class="label">Nodes</span>
                <span class="value"
                  >+{metrics.nodeAdds} / Δ{metrics.nodeMods} / −{metrics.nodeDels}</span
                >
              </li>
              <li>
                <span class="label">Edges</span>
                <span class="value"
                  >+{metrics.edgeAdds} / Δ{metrics.edgeMods} / −{metrics.edgeDels}</span
                >
              </li>
            </ul>
          </article>
        {/if}
        <article class="card">
          <header>
            <h3>Health</h3>
            <span class="muted">Renderer ↔ Worker</span>
          </header>
          <p>The worker is online and serving state_at snapshots.</p>
          <p class="meta">Keep this window open while orchestrating Plan Events.</p>
        </article>
      </div>
      {#if conflicts.length > 0}
        <section class="panel">
          <header>
            <h3>Merge Conflicts</h3>
            <p class="muted">Resolve conflicts before finalising the merge.</p>
          </header>
          <ul class="conflict-list">
            {#each conflicts as conflict (conflict.reference)}
              <li>
                <strong>{conflict.kind}</strong>
                <span>{conflict.reference}: {conflict.message}</span>
              </li>
            {/each}
          </ul>
        </section>
      {/if}
    {:else if activeTab === 'timeline'}
      {@const commitList = timelineCommits()}
      <section class="panel">
        <header>
          <h3>Commit Timeline</h3>
          <p class="muted">Select any commit to pivot the workspace.</p>
        </header>
        {#if commitList.length === 0}
          <p class="muted">No commits recorded yet for this branch.</p>
        {:else}
          <ol class="timeline">
            {#each commitList as commit (commit.id)}
              <li class={commit.id === timeState?.currentCommitId ? 'active' : ''}>
                <div class="time">{commit.time ?? '—'}</div>
                <div class="message">{commit.message}</div>
                <div class="id mono">{commit.id}</div>
                <Button variant="ghost" size="sm" onClick={() => onSelectCommit?.(commit.id)}>
                  View
                </Button>
              </li>
            {/each}
          </ol>
        {/if}
      </section>
    {:else if activeTab === 'canvas'}
      <section class="panel panel--canvas">
        <header>
          <h3>Graph Canvas</h3>
          <p class="muted">
            Pan with drag, zoom with wheel, Shift-drag marquee. Double-click to reset.
          </p>
        </header>
        <div class="canvas-shell">
          <Scene asOf={stateAt.asOf} />
        </div>
      </section>
    {:else}
      <section class="panel">
        <header>
          <h3>Activity & Diagnostics</h3>
          <p class="muted">Trace the most recent orchestration events and worker heartbeats.</p>
        </header>
        <div class="activity-hints">
          <p>
            Use <code>pnpm run issues:backfill</code> after merges to keep the timeline aligned with
            GitHub tracking.
          </p>
          <p>
            Run <code>pnpm run issues:mirror</code> whenever the desktop host reconnects after going
            offline.
          </p>
        </div>
      </section>
    {/if}
  </section>
</div>

<style>
  .workspace {
    display: flex;
    flex-direction: column;
    gap: var(--space-4, 16px);
    padding: 18px 24px 28px;
    min-height: 100%;
    background: linear-gradient(
      180deg,
      rgba(245, 247, 255, 0.82) 0%,
      rgba(247, 249, 255, 0.94) 40%,
      rgba(250, 252, 255, 0.98) 100%
    );
  }

  .workspace__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-3, 12px);
  }

  .workspace__header h1 {
    margin: 0;
    font-size: 1.4rem;
    letter-spacing: 0.01em;
  }

  .subtitle {
    margin: 2px 0 0;
    color: var(--color-muted, rgba(30, 41, 59, 0.6));
  }

  .header-meta {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .meta-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 999px;
    background: rgba(148, 163, 184, 0.16);
    color: rgba(15, 23, 42, 0.75);
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .meta-pill.warning {
    background: rgba(248, 180, 0, 0.18);
    color: rgba(120, 53, 15, 0.85);
  }

  .workspace__controls {
    display: grid;
    grid-template-columns: minmax(180px, 220px) auto minmax(220px, 1fr) auto;
    align-items: end;
    gap: 16px;
    padding: 12px 16px;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.85);
    box-shadow: 0 20px 45px -24px rgba(15, 23, 42, 0.35);
  }

  .workspace__body {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .cards {
    display: grid;
    gap: 16px;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  }

  .card {
    padding: 18px;
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.92);
    box-shadow: 0 12px 35px -20px rgba(15, 23, 42, 0.45);
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .card header {
    display: flex;
    align-items: baseline;
    gap: 10px;
  }

  .card h3 {
    margin: 0;
  }

  .card.highlight {
    background: linear-gradient(140deg, rgba(59, 130, 246, 0.15), rgba(147, 197, 253, 0.25));
    box-shadow: 0 18px 40px -24px rgba(59, 130, 246, 0.55);
  }

  dl {
    margin: 0;
    display: grid;
    gap: 10px;
  }

  dt {
    font-size: 0.75rem;
    letter-spacing: 0.06em;
    color: rgba(15, 23, 42, 0.55);
    text-transform: uppercase;
  }

  dd {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: rgba(15, 23, 42, 0.92);
  }

  .metric-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 8px;
    font-family: var(--font-mono, ui-monospace);
    font-size: 0.95rem;
  }

  .metric-list .label {
    font-weight: 600;
    margin-right: 6px;
  }

  .panel {
    padding: 18px 20px;
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.92);
    box-shadow: 0 18px 45px -28px rgba(15, 23, 42, 0.45);
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .panel header {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .panel--canvas {
    min-height: 320px;
  }

  .canvas-shell {
    flex: 1;
    min-height: 360px;
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid rgba(59, 130, 246, 0.2);
  }

  .conflict-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 8px;
  }

  .conflict-list li {
    padding: 10px 12px;
    border-radius: 12px;
    background: rgba(248, 113, 113, 0.12);
    border: 1px solid rgba(248, 113, 113, 0.35);
    display: grid;
    gap: 4px;
  }

  .timeline {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 12px;
  }

  .timeline li {
    display: grid;
    grid-template-columns: 1.2fr 2fr auto 80px;
    gap: 12px;
    align-items: center;
    padding: 12px 16px;
    border-radius: 12px;
    background: rgba(241, 245, 249, 0.65);
  }

  .timeline li.active {
    border: 1px solid rgba(59, 130, 246, 0.35);
    background: rgba(191, 219, 254, 0.45);
  }

  .timeline .time {
    font-weight: 600;
    color: rgba(15, 23, 42, 0.75);
  }

  .timeline .message {
    color: rgba(30, 41, 59, 0.85);
  }

  .timeline .id {
    font-size: 0.75rem;
    opacity: 0.65;
  }

  .activity-hints {
    display: grid;
    gap: 12px;
    font-size: 0.95rem;
  }

  .alert {
    padding: 18px;
    border-radius: 16px;
    background: rgba(248, 113, 113, 0.18);
    border: 1px solid rgba(248, 113, 113, 0.35);
    color: rgba(88, 28, 28, 0.9);
  }

  .loading {
    padding: 18px;
    border-radius: 16px;
    background: rgba(148, 163, 184, 0.12);
    border: 1px dashed rgba(148, 163, 184, 0.3);
    text-align: center;
    color: rgba(71, 85, 105, 0.8);
  }

  .muted {
    color: rgba(71, 85, 105, 0.75);
    margin: 0;
  }

  .mono {
    font-family: var(--font-mono, ui-monospace);
    font-size: 0.75rem;
    opacity: 0.75;
  }

  @media (max-width: 1100px) {
    .workspace__controls {
      grid-template-columns: minmax(180px, 1fr);
    }
    .workspace__controls :global(.field) {
      width: 100%;
    }
  }

  @media (max-width: 768px) {
    .workspace {
      padding: 16px;
    }
    .workspace__header {
      flex-direction: column;
      align-items: flex-start;
    }
    .cards {
      grid-template-columns: 1fr;
    }
    .timeline li {
      grid-template-columns: 1fr;
      gap: 6px;
    }
  }
</style>
