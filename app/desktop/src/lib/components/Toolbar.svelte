<script lang="ts">
  // Platform-aware toolbar. On Windows we render Fluent buttons; on macOS we
  // keep a lightweight style (future: Puppertino). Others default to shadcn-like
  // styles backed by our Tailwind/theme.css.
  import { IconButton } from '@aideon/design-system';
  import { debug, info, logSafely } from '$lib/logging';
  const {
    version = '—',
    onOpenSettings,
    onOpenAbout,
    onOpenStatus,
    onToggleSidebar,
    sidebarActive = true,
    branch,
    unsavedCount = 0,
  } = $props<{
    version?: string;
    onOpenSettings: () => void;
    onOpenAbout: () => void;
    onOpenStatus: () => void;
    onToggleSidebar: () => void;
    sidebarActive?: boolean;
    branch?: string | null;
    unsavedCount?: number;
  }>();

  // Lightweight reflection of the currently selected branch so the toolbar
  // can act as a global breadcrumb without forcing the sidebar to stay open.
  const branchLabel = $derived(() => branch?.toUpperCase() ?? 'MAIN');

  // Keep a local search string so we can hook up quick-jump filtering once the
  // catalog UX lands; for now we only log the intent for telemetry parity.
  let searchTerm = $state('');

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

  function handleSearchInput(event: Event) {
    const value = (event.currentTarget as HTMLInputElement)?.value ?? '';
    searchTerm = value;
    logSafely(debug, `renderer: toolbar search query="${value}"`);
  }
</script>

<div class="toolbar" role="toolbar" aria-label="Main toolbar">
  <div class="brand" aria-label="Application identity">
    <div class="mark" aria-hidden="true"></div>
    <div class="meta">
      <span class="title">Aideon Praxis</span>
      <span class="version">v{version}</span>
    </div>
  </div>
  <div class="group" aria-label="Navigation">
    <IconButton
      iconRegular="fluent:panel-left-24-regular"
      iconFilled="fluent:panel-left-24-filled"
      title="Toggle Sidebar"
      active={sidebarActive}
      onClick={handleToggleSidebar}
    />
  </div>
  <div class="search" aria-label="Quick search">
    <iconify-icon icon="fluent:search-24-regular" class="search-icon" aria-hidden="true"
    ></iconify-icon>
    <input
      type="search"
      placeholder="Find node, plan event, or asset"
      value={searchTerm}
      oninput={handleSearchInput}
      aria-label="Quick search"
    />
  </div>
  <div class="context" aria-label="Branch context">
    <span class="label">Branch</span>
    <span class="value">{branchLabel}</span>
    {#if unsavedCount > 0}
      <span class="badge" title="Unsaved changes">
        {unsavedCount}
      </span>
    {/if}
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
    gap: 16px;
    padding: 10px 16px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    background: linear-gradient(
      120deg,
      rgba(18, 37, 68, 0.95) 0%,
      rgba(44, 58, 89, 0.92) 60%,
      rgba(52, 66, 96, 0.9) 100%
    );
    color: #f3f6ff;
    backdrop-filter: saturate(160%) blur(12px);
    position: sticky;
    top: 0;
    z-index: 5;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 180px;
  }
  .mark {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: radial-gradient(
      circle at 20% 20%,
      rgba(255, 255, 255, 0.4),
      rgba(255, 255, 255, 0.08)
    );
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.12),
      0 0 15px rgba(45, 162, 255, 0.35);
  }
  .meta {
    display: flex;
    flex-direction: column;
    line-height: 1.1;
  }
  .title {
    font-weight: 600;
    font-size: 0.95rem;
    letter-spacing: 0.01em;
  }
  .version {
    font-size: 0.7rem;
    opacity: 0.75;
  }
  .search {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(255, 255, 255, 0.12);
    border-radius: 10px;
    padding: 4px 10px;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.12);
  }
  .search input {
    flex: 1;
    border: none;
    background: transparent;
    color: inherit;
    font-size: 0.9rem;
  }
  .search input::placeholder {
    color: rgba(243, 246, 255, 0.7);
  }
  .search-icon {
    font-size: 1rem;
    opacity: 0.75;
  }
  .context {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 4px 10px;
    border-radius: 999px;
    background: rgba(15, 23, 42, 0.45);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.12);
    font-size: 0.8rem;
  }
  .context .label {
    opacity: 0.7;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 0.65rem;
  }
  .context .value {
    font-weight: 600;
  }
  .badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    padding: 2px 6px;
    border-radius: 999px;
    background: rgba(255, 168, 46, 0.9);
    color: #0f172a;
    font-weight: 600;
    font-size: 0.7rem;
  }
  .group {
    display: flex;
    gap: 8px;
  }
  .group + .group {
    border-left: 1px solid rgba(255, 255, 255, 0.14);
    padding-left: 16px;
  }

  @media (max-width: 960px) {
    .toolbar {
      flex-wrap: wrap;
      gap: 12px;
    }
    .brand {
      order: -2;
    }
    .context {
      order: -1;
    }
    .search {
      min-width: 100%;
      order: 10;
    }
  }
</style>
