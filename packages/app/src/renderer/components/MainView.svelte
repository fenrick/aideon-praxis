<script lang="ts">
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
</script>

<div style="padding: 16px;">
  <div style="display: flex; align-items: center; justify-content: space-between;">
    <h1 style="margin: 0;">Aideon Praxis</h1>
  </div>
  <p>Renderer booted. Bridge version: {version}</p>
  <hr />
  <h2>Worker Connectivity</h2>
  {#if errorMsg}
    <p style="color: crimson;">Error: {errorMsg}</p>
  {:else if stateAt}
    <pre style="background: #0f172a0d; padding: 12px; border-radius: 6px;">{JSON.stringify(
        stateAt,
        null,
        2,
      )}</pre>
  {:else}
    <p>Querying worker…</p>
  {/if}
</div>
