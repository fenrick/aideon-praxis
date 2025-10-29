<!-- Main shell content shown after renderer boot. Mirrors the worker handshake
     status so the desktop host can surface debugging hints inline. Leveraging
     typed `$props` follows the Svelte TypeScript guidance for explicit inputs. -->
<script lang="ts">
  import { debug, error as logError, info as logInfo, logSafely } from '$lib/logging';
  import Scene from '$lib/canvas/Scene.svelte';
  const { version, stateAt, errorMsg } = $props<{
    version: string;
    stateAt: {
      asOf: string;
      scenario: string | null;
      confidence: number | null;
      nodes: number;
      edges: number;
    } | null;
    errorMsg: string | null;
  }>();
  $effect(() => {
    logSafely(debug, `renderer: main view version=${version}`);
  });
  $effect(() => {
    if (!stateAt) {
      return;
    }
    logSafely(
      logInfo,
      `renderer: main view displaying stateAt asOf=${stateAt.asOf} nodes=${stateAt.nodes} edges=${stateAt.edges}`,
    );
  });
  $effect(() => {
    if (!errorMsg) {
      return;
    }
    logSafely(logError, `renderer: main view error=${errorMsg}`);
  });
</script>

<div class="main">
  <div style="display: flex; align-items: center; justify-content: space-between;">
    <h1 style="margin: 0;">Aideon Praxis</h1>
  </div>
  <p class="muted">Renderer booted. Bridge version: {version}</p>
  <hr />
  <h2>Worker Connectivity</h2>
  {#if errorMsg}
    <p style="color: crimson;">Error: {errorMsg}</p>
  {:else if stateAt}
    <pre class="mono">{JSON.stringify(stateAt, null, 2)}</pre>
    <h2 style="margin-top: 1rem;">Canvas (M1 preview)</h2>
    <p class="muted">Pan with drag, zoom with wheel, Shift‑drag marquee. Double‑click reset.</p>
    <Scene />
  {:else}
    <p class="muted">Querying worker…</p>
  {/if}
</div>

<style>
  .main {
    padding: var(--space-4);
    color: var(--color-text);
  }
  .muted {
    color: var(--color-muted);
  }
  .mono {
    background: var(--color-surface);
    padding: var(--space-3);
    border-radius: var(--radius-1);
    border: 1px solid var(--color-border);
    font-family: var(--font-mono);
  }
</style>
