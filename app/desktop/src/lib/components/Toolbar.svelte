<script lang="ts">
  // Platform-aware toolbar. On Windows we render Fluent buttons; on macOS we
  // keep a lightweight style (future: Puppertino). Others default to shadcn-like
  // styles backed by our Tailwind/theme.css.
  import IconButton from '$lib/ui/IconButton.svelte';
  import { debug, info, logSafely } from '$lib/logging';
  const {
    onOpenSettings,
    onOpenAbout,
    onOpenStatus,
    onToggleSidebar,
    sidebarActive = true,
  } = $props<{
    onOpenSettings: () => void;
    onOpenAbout: () => void;
    onOpenStatus: () => void;
    onToggleSidebar: () => void;
    sidebarActive?: boolean;
  }>();

  function handleToggleSidebar() {
    logSafely(debug, `renderer: toolbar toggle sidebar requested active=${!sidebarActive}`);
    onToggleSidebar();
  }

  function handleOpenStatus() {
    logSafely(info, 'renderer: toolbar open status');
    onOpenStatus();
  }

  function handleOpenSettings() {
    logSafely(info, 'renderer: toolbar open settings');
    onOpenSettings();
  }

  function handleOpenAbout() {
    logSafely(info, 'renderer: toolbar open about');
    onOpenAbout();
  }
</script>

<div class="toolbar" role="toolbar" aria-label="Main toolbar">
  <div class="group" aria-label="Navigation">
    <IconButton
      iconRegular="fluent:panel-left-24-regular"
      iconFilled="fluent:panel-left-24-filled"
      title="Toggle Sidebar"
      active={sidebarActive}
      onClick={handleToggleSidebar}
    />
  </div>
  <div class="group" aria-label="Inspect & Status">
    <IconButton
      iconRegular="fluent:task-list-24-regular"
      iconFilled="fluent:task-list-24-filled"
      title="Status"
      onClick={handleOpenStatus}
    />
  </div>
  <div class="group" aria-label="Application">
    <IconButton
      iconRegular="fluent:settings-24-regular"
      iconFilled="fluent:settings-24-filled"
      title="Settings"
      onClick={handleOpenSettings}
    />
    <IconButton
      iconRegular="fluent:info-24-regular"
      iconFilled="fluent:info-24-filled"
      title="About"
      onClick={handleOpenAbout}
    />
  </div>
</div>

<style>
  .toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 12px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
    background: rgba(255, 255, 255, 0.6);
    backdrop-filter: saturate(140%) blur(8px);
    position: sticky;
    top: 0;
    z-index: 5;
  }
  .group {
    display: flex;
    gap: 8px;
  }
  .group + .group {
    border-left: 1px solid rgba(0, 0, 0, 0.08);
    padding-left: 12px;
  }
</style>
