<script lang="ts">
  // Platform-aware toolbar. On Windows we render Fluent buttons; on macOS we
  // keep a lightweight style (future: Puppertino). Others default to shadcn-like
  // styles backed by our Tailwind/theme.css.
  import { IconButton } from '@aideon/design-system';
  import { debug, info, logSafely } from '$lib/logging';
  import { searchStore, type SearchResult } from '$lib/stores/search';
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
  let results = $state<SearchResult[]>([]);
  let isFocused = $state(false);
  let highlightedIndex = $state(-1);
  let searchInput: HTMLInputElement | null = null;
  const overlayVisible = $derived(() => isFocused && results.length > 0);

  const KIND_LABEL: Record<SearchResult['kind'], string> = {
    sidebar: 'Navigation',
    commit: 'Commit',
    catalog: 'Catalog',
  };

  const DEBOUNCE_MS = 180;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  function resetSearch() {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    searchTerm = '';
    results = [];
    highlightedIndex = -1;
    searchStore.clear();
  }

  function scheduleSearch(value: string) {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    if (!value.trim()) {
      debounceTimer = null;
      results = [];
      highlightedIndex = -1;
      searchStore.clear();
      return;
    }
    debounceTimer = setTimeout(() => {
      logSafely(debug, `renderer: toolbar search query="${value}"`);
      results = searchStore.search(value);
      highlightedIndex = results.length > 0 ? 0 : -1;
      debounceTimer = null;
    }, DEBOUNCE_MS);
  }

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
    scheduleSearch(value);
  }

  function handleSearchFocus() {
    isFocused = true;
    if (searchTerm.trim()) {
      results = searchStore.search(searchTerm);
      highlightedIndex = results.length > 0 ? 0 : -1;
    }
  }

  function handleSearchBlur(event: FocusEvent) {
    const next = event.relatedTarget as HTMLElement | null;
    if (next && next.closest('.search-results')) {
      return;
    }
    isFocused = false;
    results = [];
    highlightedIndex = -1;
  }

  function highlightResult(index: number) {
    if (results.length === 0) {
      highlightedIndex = -1;
      return;
    }
    const normalized = (index + results.length) % results.length;
    highlightedIndex = normalized;
  }

  async function activateResult(index: number) {
    if (!Number.isInteger(index) || index < 0 || index >= results.length) {
      return;
    }
    const [result] = results.slice(index, index + 1);
    if (!result) {
      return;
    }
    try {
      await result.run?.();
    } catch (error) {
      logSafely(debug, `renderer: search activation failed — ${String(error)}`);
    }
    resetSearch();
    isFocused = false;
    searchInput?.blur();
  }

  function handleSearchKeydown(event: KeyboardEvent) {
    if (!overlayVisible()) {
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      highlightResult(highlightedIndex + 1);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      highlightResult(highlightedIndex - 1);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      void activateResult(highlightedIndex);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      resetSearch();
      isFocused = false;
      searchInput?.blur();
    }
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
      onfocus={handleSearchFocus}
      onblur={handleSearchBlur}
      onkeydown={handleSearchKeydown}
      aria-expanded={overlayVisible()}
      aria-controls="toolbar-search-results"
      aria-activedescendant={highlightedIndex >= 0
        ? `toolbar-search-result-${highlightedIndex}`
        : undefined}
      bind:this={searchInput}
      aria-label="Quick search"
    />
    {#if overlayVisible()}
      <div class="search-results" id="toolbar-search-results" role="listbox">
        {#each results as result, index (result.id)}
          <button
            type="button"
            role="option"
            class={index === highlightedIndex ? 'search-result active' : 'search-result'}
            aria-selected={index === highlightedIndex}
            id={`toolbar-search-result-${index}`}
            on:mousedown|preventDefault={() => highlightResult(index)}
            on:mouseenter={() => highlightResult(index)}
            on:click={() => void activateResult(index)}
          >
            <span class="title">{result.title}</span>
            <span class="meta">{result.subtitle ?? KIND_LABEL[result.kind]}</span>
          </button>
        {/each}
      </div>
    {/if}
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
    position: relative;
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
  .search-results {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 8px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    box-shadow: var(--shadow-3);
    z-index: 10;
  }
  .search-result {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    padding: 8px 10px;
    border-radius: 8px;
    border: none;
    background: transparent;
    cursor: pointer;
    text-align: left;
    color: inherit;
    font: inherit;
  }
  .search-result:hover,
  .search-result.active {
    background: color-mix(in srgb, var(--color-accent) 18%, var(--color-surface));
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-accent) 35%, transparent);
  }
  .search-result .title {
    font-size: 0.9rem;
    font-weight: 600;
  }
  .search-result .meta {
    font-size: 0.75rem;
    color: color-mix(in srgb, var(--color-muted) 70%, transparent);
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
