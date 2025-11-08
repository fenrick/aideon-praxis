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
  import { getMainViewCopy } from '$lib/locales/main-view';
  import { shouldShowSeededTimeline } from './main-view.helpers';

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
    onOpenStyleGuide,
    onCreateScenario,
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
    onOpenStyleGuide?: () => void | Promise<void>;
    onCreateScenario?: () => void | Promise<void>;
  }>();

  const numberFormatter = new Intl.NumberFormat();

  const dispatch = createEventDispatcher<{ tabChange: WorkspaceTab }>();
  const copy = getMainViewCopy();

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
  const showSeededTimelineEmpty = $derived(() => shouldShowSeededTimeline(timeState));

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

  function goToTimeline() {
    handleTabSelect('timeline');
  }

  function goToOverview() {
    handleTabSelect('overview');
  }

  function goToCanvas() {
    handleTabSelect('canvas');
  }

  async function handleOpenStyleGuideClick() {
    try {
      await onOpenStyleGuide?.();
    } catch (error_) {
      logSafely(logError, `renderer: open style guide failed — ${String(error_)}`);
    }
  }

  async function handleCreateScenarioClick() {
    try {
      if (onCreateScenario) {
        await onCreateScenario();
        return;
      }
    } catch (error_) {
      logSafely(logError, `renderer: scenario CTA failed — ${String(error_)}`);
      return;
    }
    goToTimeline();
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
        {#if showSeededTimelineEmpty()}
          <div class="empty-history" role="status" aria-live="polite">
            <h4>{copy.timeline.empty.title}</h4>
            <p>{copy.timeline.empty.description}</p>
            <div class="empty-history__actions">
              <Button variant="ghost" size="sm" onClick={handleOpenStyleGuideClick}>
                {copy.timeline.empty.styleGuideCta}
              </Button>
              <Button variant="primary" size="sm" onClick={handleCreateScenarioClick}>
                {copy.timeline.empty.scenarioCta}
              </Button>
            </div>
          </div>
        {:else if commitList.length === 0}
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
          <p class="muted">{copy.activity.summary}</p>
        </header>
        <div class="activity-hints">
          <div class="activity-actions">
            <Button variant="primary" size="sm" onClick={goToTimeline}>
              {copy.activity.timelineCta}
            </Button>
            <Button variant="ghost" size="sm" onClick={goToOverview}>
              {copy.activity.diffCta}
            </Button>
            <Button variant="ghost" size="sm" onClick={goToCanvas}>
              {copy.activity.canvasCta}
            </Button>
          </div>
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
    background: var(--color-bg);
    color: var(--color-text);
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
    color: var(--color-muted);
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
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    box-shadow: var(--shadow-1);
    color: color-mix(in srgb, var(--color-text) 80%, transparent);
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .meta-pill.warning {
    background: color-mix(in srgb, var(--color-danger) 16%, var(--color-surface));
    border-color: color-mix(in srgb, var(--color-danger) 45%, var(--color-border));
    color: color-mix(in srgb, var(--color-danger) 70%, var(--color-text));
  }

  .workspace__controls {
    display: grid;
    grid-template-columns: minmax(180px, 220px) auto minmax(220px, 1fr) auto;
    align-items: end;
    gap: 16px;
    padding: 12px 16px;
    border-radius: 14px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    box-shadow: var(--shadow-2);
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
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    box-shadow: var(--shadow-2);
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
    border-color: color-mix(in srgb, var(--color-accent) 35%, var(--color-border));
    box-shadow: var(--shadow-2);
  }

  dl {
    margin: 0;
    display: grid;
    gap: 10px;
  }

  dt {
    font-size: 0.75rem;
    letter-spacing: 0.06em;
    color: color-mix(in srgb, var(--color-muted) 90%, transparent);
    text-transform: uppercase;
  }

  dd {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--color-text);
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
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    box-shadow: var(--shadow-2);
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
    border: 1px solid var(--color-border);
    background: color-mix(in srgb, var(--color-bg) 92%, transparent);
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
    background: color-mix(in srgb, var(--color-danger) 14%, var(--color-surface));
    border: 1px solid color-mix(in srgb, var(--color-danger) 40%, var(--color-border));
    color: color-mix(in srgb, var(--color-danger) 65%, var(--color-text));
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
    background: color-mix(in srgb, var(--color-surface) 92%, transparent);
    border: 1px solid var(--color-border);
  }

  .timeline li.active {
    border-color: color-mix(in srgb, var(--color-accent) 45%, var(--color-border));
    background: color-mix(in srgb, var(--color-accent) 18%, var(--color-surface));
  }

  .timeline .time {
    font-weight: 600;
    color: color-mix(in srgb, var(--color-text) 85%, transparent);
  }

  .timeline .message {
    color: color-mix(in srgb, var(--color-text) 70%, transparent);
  }

  .timeline .id {
    font-size: 0.75rem;
    color: var(--color-muted);
  }

  .activity-hints {
    display: flex;
    flex-direction: column;
    gap: 12px;
    font-size: 0.95rem;
  }

  .activity-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .empty-history {
    display: grid;
    gap: 10px;
    padding: 16px;
    border-radius: 12px;
    background: color-mix(in srgb, var(--color-accent) 12%, var(--color-surface));
    border: 1px solid color-mix(in srgb, var(--color-accent) 35%, var(--color-border));
  }

  .empty-history h4 {
    margin: 0;
    font-size: 1rem;
  }

  .empty-history__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .alert {
    padding: 18px;
    border-radius: 16px;
    background: color-mix(in srgb, var(--color-danger) 20%, var(--color-surface));
    border: 1px solid color-mix(in srgb, var(--color-danger) 45%, var(--color-border));
    color: color-mix(in srgb, var(--color-danger) 70%, var(--color-text));
  }

  .loading {
    padding: 18px;
    border-radius: 16px;
    background: color-mix(in srgb, var(--color-muted) 12%, var(--color-surface));
    border: 1px dashed var(--color-border);
    text-align: center;
    color: color-mix(in srgb, var(--color-muted) 70%, var(--color-text));
  }

  .muted {
    color: var(--color-muted);
    margin: 0;
  }

  .mono {
    font-family: var(--font-mono, ui-monospace);
    font-size: 0.75rem;
    color: color-mix(in srgb, var(--color-text) 70%, transparent);
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
