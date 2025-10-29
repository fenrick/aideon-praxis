<!-- Main shell content shown after renderer boot. Mirrors the worker handshake
     status so the desktop host can surface debugging hints inline. Leveraging
     typed `$props` follows the Svelte TypeScript guidance for explicit inputs. -->
<script lang="ts">
  import { debug, error as logError, info as logInfo, logSafely } from '$lib/logging';
  import Canvas from '$lib/canvas/Canvas.svelte';
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
    <p class="muted">Pan with drag, zoom with wheel, double‑click to reset.</p>
    <Canvas>
      <!-- Simple demo content -->
      <div
        style="position:absolute; left:200px; top:200px; width:200px; height:120px; background:#2563eb; color:white; display:flex; align-items:center; justify-content:center; border-radius:8px;"
      >
        Node A
      </div>
      <div
        style="position:absolute; left:600px; top:480px; width:220px; height:140px; background:#059669; color:white; display:flex; align-items:center; justify-content:center; border-radius:8px;"
      >
        Node B
      </div>
    </Canvas>
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
