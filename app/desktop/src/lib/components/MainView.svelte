<script lang="ts">
  import { debug, error as logError, info as logInfo, logSafely } from '$lib/logging';
  import Scene from '$lib/canvas/Scene.svelte';
  import type { TimeStoreState } from '$lib/stores/time';

  const {
    version,
    stateAt,
    errorMsg,
    timeState,
    onSelectBranch,
    onSelectCommit,
    onMerge,
    onRefreshBranches,
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
  }>();

  let currentStateAt = $state(stateAt);

  $effect(() => {
    logSafely(debug, `renderer: main view version=${version}`);
  });

  $effect(() => {
    if (!currentStateAt) {
      return;
    }
    logSafely(
      logInfo,
      `renderer: main view displaying snapshot commit=${currentStateAt.asOf} nodes=${currentStateAt.nodes} edges=${currentStateAt.edges}`,
    );
  });

  $effect(() => {
    if (!errorMsg) {
      return;
    }
    logSafely(logError, `renderer: main view error=${errorMsg}`);
  });

  const handleBranchChange = async (event: Event) => {
    const target = event.currentTarget as HTMLSelectElement;
    const value = target.value;
    if (value) {
      await onSelectBranch?.(value);
    }
  };

  const handleCommitChange = async (event: Event) => {
    const target = event.currentTarget as HTMLSelectElement;
    const value = target.value;
    await onSelectCommit?.(value || null);
  };

  const handleMergeClick = async () => {
    if (!timeState?.branch || timeState.branch === 'main') {
      return;
    }
    await onMerge?.(timeState.branch, 'main');
  };

  const triggerRefreshBranches = () => {
    onRefreshBranches?.();
  };
</script>

<div class="main">
  <div class="header">
    <h1>Aideon Praxis</h1>
  </div>
  <p class="muted">Renderer booted. Bridge version: {version}</p>

  {#if timeState}
    <div class="branch-controls">
      <label>
        Branch
        <select onchange={handleBranchChange} value={timeState.branch}>
          {#if timeState.branches.length > 0}
            {#each timeState.branches as branch (branch.name)}
              <option value={branch.name}>{branch.name}</option>
            {/each}
          {:else}
            <option value={timeState.branch}>{timeState.branch}</option>
          {/if}
        </select>
      </label>
      <button
        class="refresh"
        type="button"
        onclick={triggerRefreshBranches}
        title="Refresh branches"
      >
        ↻
      </button>
      <label>
        Commit
        <select onchange={handleCommitChange} value={timeState.currentCommitId ?? ''}>
          {#each timeState.commits as commit (commit.id)}
            <option value={commit.id}>
              {commit.message} — {commit.time ?? commit.id}
            </option>
          {/each}
        </select>
      </label>
      {#if timeState.unsavedCount > 0}
        <span class="unsaved">Unsaved changes: {timeState.unsavedCount}</span>
      {/if}
      {#if timeState.branch !== 'main'}
        <button class="merge" type="button" onclick={handleMergeClick}>Merge into main</button>
      {/if}
    </div>
  {/if}

  <hr />
  <h2>Worker Connectivity</h2>
  {#if errorMsg}
    <p class="error">Error: {errorMsg}</p>
  {:else if currentStateAt}
    <div class="row asof">
      <label for="asof">Commit ID</label>
      <input id="asof" type="text" value={currentStateAt.asOf} readonly />
    </div>
    <pre class="mono">{JSON.stringify(currentStateAt, null, 2)}</pre>
    {#if timeState?.diff}
      <div class="diff-legend">
        <span>
          Nodes +{timeState.diff.metrics.nodeAdds}
          / Δ{timeState.diff.metrics.nodeMods}
          / −{timeState.diff.metrics.nodeDels}
        </span>
        <span>
          Edges +{timeState.diff.metrics.edgeAdds}
          / Δ{timeState.diff.metrics.edgeMods}
          / −{timeState.diff.metrics.edgeDels}
        </span>
      </div>
    {/if}
    {#if timeState?.mergeConflicts && timeState.mergeConflicts.length > 0}
      <div class="merge-conflicts">
        <h3>Merge Conflicts</h3>
        <ul>
          {#each timeState.mergeConflicts as conflict (conflict.reference)}
            <li>
              <strong>{conflict.kind}</strong>
              {conflict.reference}: {conflict.message}
            </li>
          {/each}
        </ul>
      </div>
    {/if}
    <h2 style="margin-top: 1rem;">Canvas (M1 preview)</h2>
    <p class="muted">Pan with drag, zoom with wheel, Shift-drag marquee. Double-click reset.</p>
    <Scene asOf={currentStateAt.asOf} />
  {:else}
    <p class="muted">Querying worker…</p>
  {/if}
</div>

<style>
  .main {
    padding: var(--space-4);
    color: var(--color-text);
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .header h1 {
    margin: 0;
  }

  .branch-controls {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    margin: var(--space-3) 0;
  }

  .branch-controls select {
    margin-left: var(--space-1);
  }

  .refresh {
    border: none;
    background: transparent;
    cursor: pointer;
    font-size: 0.9rem;
  }

  .merge {
    background: var(--accent-color, #1f6feb);
    border: none;
    color: white;
    padding: 4px 10px;
    border-radius: var(--radius-1);
    cursor: pointer;
  }

  .unsaved {
    color: var(--color-warning, #bb6b00);
    font-weight: 600;
  }

  .muted {
    color: var(--color-muted);
  }

  .error {
    color: crimson;
  }

  .mono {
    background: var(--color-surface);
    padding: var(--space-3);
    border-radius: var(--radius-1);
    border: 1px solid var(--color-border);
    font-family: var(--font-mono);
  }

  .asof {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }

  .diff-legend {
    display: flex;
    gap: var(--space-3);
    font-size: 0.9rem;
    margin: var(--space-2) 0;
  }

  .merge-conflicts {
    border: 1px solid rgba(255, 99, 71, 0.4);
    padding: var(--space-3);
    border-radius: var(--radius-1);
    background: rgba(255, 99, 71, 0.1);
    margin-bottom: var(--space-3);
  }

  .merge-conflicts ul {
    margin: 0;
    padding-left: var(--space-4);
  }
</style>
