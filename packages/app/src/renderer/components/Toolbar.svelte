<script lang="ts">
  // Platform-aware toolbar. On Windows we render Fluent buttons; on macOS we
  // keep a lightweight style (future: Puppertino). Others default to shadcn-like
  // styles backed by our Tailwind/theme.css.
  import IconButton from '../../ui/IconButton.svelte';
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
</script>

<div class="toolbar" role="toolbar" aria-label="Main toolbar">
  <div class="group" aria-label="Navigation">
    <IconButton
      iconRegular="fluent:panel-left-24-regular"
      iconFilled="fluent:panel-left-24-filled"
      title="Toggle Sidebar"
      active={sidebarActive}
      onClick={onToggleSidebar}
    />
  </div>
  <div class="group" aria-label="Inspect & Status">
    <IconButton
      iconRegular="fluent:task-list-24-regular"
      iconFilled="fluent:task-list-24-filled"
      title="Status"
      onClick={onOpenStatus}
    />
  </div>
  <div class="group" aria-label="Application">
    <IconButton
      iconRegular="fluent:settings-24-regular"
      iconFilled="fluent:settings-24-filled"
      title="Settings"
      onClick={onOpenSettings}
    />
    <IconButton
      iconRegular="fluent:info-24-regular"
      iconFilled="fluent:info-24-filled"
      title="About"
      onClick={onOpenAbout}
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
