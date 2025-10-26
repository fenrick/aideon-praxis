<script lang="ts">
  // Lightweight custom titlebar for platforms where we draw window chrome.
  // All window control interactions are routed via the Tauri Window API.
  const { title = 'Aideon Praxis', platform = 'other' } = $props<{
    title?: string;
    platform?: 'mac' | 'win' | 'linux' | 'other';
  }>();
  let Window: any;
  import('@tauri-apps/api/window').then((m) => (Window = m.Window)).catch(() => {});

  // Minimize the current window if available; ignore when not running under Tauri.
  function minimize() {
    try {
      Window?.getCurrent()?.minimize();
    } catch {}
  }
  // Toggle between maximized and restored window states.
  function maximizeOrRestore() {
    try {
      Window?.getCurrent()?.toggleMaximize();
    } catch {}
  }
  // Close the current window.
  function close() {
    try {
      Window?.getCurrent()?.close();
    } catch {}
  }
</script>

<header class="titlebar" data-tauri-drag-region="true">
  <div class="left no-drag">
    {#if platform === 'mac'}
      <div class="traffic-lights">
        <button
          class="close"
          aria-label="Close"
          title="Close"
          onclick={(event) => {
            event.stopPropagation();
            close();
          }}
        ></button>
        <button
          class="min"
          aria-label="Minimize"
          title="Minimize"
          onclick={(event) => {
            event.stopPropagation();
            minimize();
          }}
        ></button>
        <button
          class="max"
          aria-label="Zoom"
          title="Zoom"
          onclick={(event) => {
            event.stopPropagation();
            maximizeOrRestore();
          }}
        ></button>
      </div>
    {/if}
  </div>
  <div class="center">{title}</div>
  <div class="right no-drag">
    {#if platform !== 'mac'}
      <button
        class="win-btn"
        onclick={(event) => {
          event.stopPropagation();
          minimize();
        }}
        aria-label="Minimize"
      >
        –
      </button>
      <button
        class="win-btn"
        onclick={(event) => {
          event.stopPropagation();
          maximizeOrRestore();
        }}
        aria-label="Maximize">□</button
      >
      <button
        class="win-btn close"
        onclick={(event) => {
          event.stopPropagation();
          close();
        }}
        aria-label="Close"
      >
        ×
      </button>
    {/if}
  </div>
</header>

<style>
  .titlebar {
    height: 32px;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    padding: 0 8px;
    user-select: none;
  }
  .center {
    text-align: center;
    font-size: 12px;
    opacity: 0.8;
  }
  .left,
  .right {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .no-drag {
    -webkit-app-region: no-drag;
  }
  .traffic-lights {
    display: flex;
    gap: 6px;
    padding-left: 6px;
  }
  .traffic-lights button {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: none;
    background: #ff5f57;
  }
  .traffic-lights .min {
    background: #febc2e;
  }
  .traffic-lights .max {
    background: #28c840;
  }
  .win-btn {
    width: 28px;
    height: 20px;
    border: none;
    background: transparent;
    color: inherit;
  }
  .win-btn.close:hover {
    color: #fff;
    background: #d33;
  }
</style>
