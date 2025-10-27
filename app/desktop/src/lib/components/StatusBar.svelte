<!-- Status bar indicator that reflects the worker connection health.
     Keeps the UI readonly; all state comes via typed props so the host retains control. -->
<script lang="ts">
  const { connected, message } = $props<{ connected: boolean; message?: string }>();
</script>

<div class="statusbar" data-connected={connected}>
  <span class="dot" aria-hidden="true"></span>
  <span class="text"
    >{connected ? 'Connected' : 'Disconnected'}{message ? ` — ${message}` : ''}</span
  >
</div>

<style>
  .statusbar {
    position: sticky;
    bottom: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    border-top: 1px solid rgba(0, 0, 0, 0.08);
    background: rgba(255, 255, 255, 0.6);
    backdrop-filter: saturate(140%) blur(8px);
  }
  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #d33;
  }
  .statusbar[data-connected='true'] .dot {
    background: #2ecc71;
  }
  .text {
    font-size: 12px;
    opacity: 0.85;
  }
</style>
