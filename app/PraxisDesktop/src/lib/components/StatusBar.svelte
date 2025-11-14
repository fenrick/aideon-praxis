<!-- Status bar indicator that reflects the worker connection health.
     Keeps the UI readonly; all state comes via typed props so the host retains control. -->
<script lang="ts">
  import { debug, info, logSafely } from '$lib/logging';
  type StatusDetail = { label: string; value: string };
  const {
    connected,
    message,
    details = [],
  } = $props<{
    connected: boolean;
    message?: string;
    details?: StatusDetail[];
  }>();
  $effect(() => {
    const suffix = message ? ` message=${message}` : '';
    logSafely(
      connected ? info : debug,
      `renderer: statusbar state connected=${connected}${suffix}`,
    );
  });
</script>

<div class="statusbar" data-connected={connected}>
  <div class="identity">
    <span class="dot" aria-hidden="true"></span>
    <span class="text"
      >{connected ? 'Connected' : 'Disconnected'}{message ? ` — ${message}` : ''}</span
    >
  </div>
  {#if details.length > 0}
    <ul class="meta" aria-label="Snapshot details">
      {#each details as item (item.label)}
        <li>
          <span class="meta-label">{item.label}</span>
          <span class="meta-value">{item.value}</span>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .statusbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 4px 16px;
    border-top: 1px solid rgba(15, 23, 42, 0.1);
    background: rgba(248, 250, 255, 0.82);
    backdrop-filter: saturate(140%) blur(12px);
    min-height: 32px;
  }
  .identity {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #ef4444;
  }
  .statusbar[data-connected='true'] .dot {
    background: #22c55e;
  }
  .text {
    font-size: 12px;
    opacity: 0.8;
    font-weight: 500;
  }
  .meta {
    display: inline-flex;
    align-items: center;
    gap: 16px;
    list-style: none;
    margin: 0;
    padding: 0;
    font-size: 12px;
    color: rgba(15, 23, 42, 0.75);
  }
  .meta-label {
    opacity: 0.65;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-right: 6px;
  }
  .meta-value {
    font-weight: 600;
  }

  @media (max-width: 860px) {
    .statusbar {
      flex-direction: column;
      align-items: flex-start;
      gap: 6px;
      padding: 8px 12px;
    }
    .meta {
      flex-wrap: wrap;
      gap: 12px;
    }
  }
</style>
