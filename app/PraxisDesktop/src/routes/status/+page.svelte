<script lang="ts">
  import { info } from '@tauri-apps/plugin-log';
  import { onMount } from 'svelte';

  let version = 'unknown';

  onMount(async () => {
    const global = globalThis as unknown as { aideon?: { version?: string } };
    version = global.aideon?.version ?? 'unknown';
    try {
      await info('status: window loaded');
    } catch (error) {
      if (import.meta.env.DEV) {
        globalThis.console.warn?.('status: failed to log load message', error);
      }
    }
  });
</script>

<div class="status">
  <div class="status-row">
    <span class="indicator"></span>
    <strong>Status:</strong>
    <span>Ready</span>
  </div>
  <div class="bridge">Bridge: {version}</div>
</div>

<style>
  .status {
    padding: 12px;
    font:
      13px/1.4 -apple-system,
      BlinkMacSystemFont,
      'Segoe UI',
      Roboto,
      Ubuntu,
      Cantarell,
      'Noto Sans',
      Arial,
      sans-serif;
  }
  .status-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .indicator {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #2ecc71;
  }
  .bridge {
    opacity: 0.8;
    margin-top: 6px;
  }
</style>
