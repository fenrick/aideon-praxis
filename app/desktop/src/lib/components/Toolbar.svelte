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
    border-bottom: 1px solid var(--color-border);
    background: var(--color-surface);
    color: var(--color-text);
    box-shadow: var(--shadow-1);
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
    background: color-mix(in srgb, var(--color-accent) 24%, var(--color-surface));
    border: 1px solid color-mix(in srgb, var(--color-accent) 45%, var(--color-border));
    box-shadow: var(--shadow-2);
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
    color: color-mix(in srgb, var(--color-muted) 80%, transparent);
  }
  .search {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--color-bg);
    border-radius: 10px;
    padding: 4px 10px;
    border: 1px solid var(--color-border);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-border) 40%, transparent);
  }
  .search input {
    flex: 1;
    border: none;
    background: transparent;
    color: inherit;
    font-size: 0.9rem;
  }
  .search input::placeholder {
    color: color-mix(in srgb, var(--color-muted) 70%, transparent);
  }
  .search-icon {
    font-size: 1rem;
    color: color-mix(in srgb, var(--color-muted) 80%, transparent);
  }
  .context {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 4px 10px;
    border-radius: 999px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    box-shadow: var(--shadow-1);
    font-size: 0.8rem;
  }
  .context .label {
    color: color-mix(in srgb, var(--color-muted) 85%, transparent);
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
    background: var(--color-danger);
    color: var(--color-bg);
    font-weight: 600;
    font-size: 0.7rem;
  }
  .group {
    display: flex;
    gap: 8px;
  }
  .group + .group {
    border-left: 1px solid color-mix(in srgb, var(--color-border) 70%, transparent);
    padding-left: 16px;
  }

  :global(:root.platform-mac) .toolbar,
  :global(:root.platform-win) .toolbar,
  :global(:root.platform-linux) .toolbar {
    background: linear-gradient(
      120deg,
      color-mix(in srgb, var(--color-accent) 18%, var(--color-surface)) 0%,
      var(--color-surface) 100%
    );
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
