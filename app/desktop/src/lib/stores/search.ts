import { get, writable } from 'svelte/store';

import type { SidebarTreeNode } from '../components/sidebar.types.js';
import type { TemporalCommitSummary } from '../types.js';

export type SearchResultKind = 'sidebar' | 'commit' | 'catalog';

export interface CatalogEntitySummary {
  /** Unique identifier for the catalog entry. */
  id: string;
  /** Display name for the catalog entry. */
  name: string;
  /** High-level classification used for faceting in the UI. */
  type: string;
  /** Optional description that provides more context for search results. */
  description?: string;
  /** Optional sidebar node identifier that should be focused when the entity is opened. */
  sidebarId?: string;
}

export interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  kind: SearchResultKind;
  run?: () => void | Promise<void>;
}

interface SearchIndexItem extends SearchResult {
  searchValue: string;
  titleValue: string;
  priority: number;
}

interface SearchStoreState {
  query: string;
  items: SearchIndexItem[];
  results: SearchResult[];
}

type SidebarSelectHandler = (id: string) => void | Promise<void>;
type CommitSelectHandler = (id: string) => void | Promise<void>;
type CatalogSelectHandler = (entity: CatalogEntitySummary) => void | Promise<void>;

type SourceKey = 'sidebar' | 'commits' | 'catalog';

const normalize = (value: string): string =>
  value
    .normalize('NFKD')
    .replaceAll(/\p{Diacritic}/gu, '')
    .toLowerCase();

const tokenize = (value: string): string[] =>
  normalize(value)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

const basePriority: Record<SearchResultKind, number> = {
  sidebar: 1,
  catalog: 0.75,
  commit: 0.5,
};

const createSidebarEntry = (
  item: SidebarTreeNode,
  path: string[],
  onSelect?: SidebarSelectHandler,
): SearchIndexItem => {
  const title = item.label;
  const subtitle = path.slice(0, -1).join(' • ');
  const searchTokens = [title, subtitle, path.join(' ')].filter(Boolean).join(' ');
  return {
    id: `sidebar:${item.id}`,
    title,
    subtitle: subtitle || undefined,
    kind: 'sidebar',
    run: onSelect ? () => onSelect(item.id) : undefined,
    searchValue: tokenize(searchTokens).join(' '),
    titleValue: normalize(title),
    priority: basePriority.sidebar + (path.length > 1 ? 0.1 : 0),
  };
};

const buildSidebarIndex = (
  items: SidebarTreeNode[],
  onSelect?: SidebarSelectHandler,
  parents: string[] = [],
): SearchIndexItem[] =>
  items.flatMap((item) => {
    const path = [...parents, item.label];
    const entry = createSidebarEntry(item, path, onSelect);
    if (!item.children?.length) {
      return [entry];
    }
    return [entry, ...buildSidebarIndex(item.children, onSelect, path)];
  });

const buildCommitIndex = (
  commits: TemporalCommitSummary[],
  onSelect?: CommitSelectHandler,
): SearchIndexItem[] =>
  commits.map((commit) => {
    const subtitleParts = [commit.time, commit.author].filter(Boolean);
    const subtitle = subtitleParts.join(' • ') || undefined;
    const keywords = [commit.id, commit.branch, commit.message, ...commit.tags];
    const searchTokens = keywords.join(' ');
    return {
      id: `commit:${commit.id}`,
      title: commit.message,
      subtitle,
      kind: 'commit',
      run: onSelect ? () => onSelect(commit.id) : undefined,
      searchValue: tokenize(searchTokens).join(' '),
      titleValue: normalize(commit.message),
      priority: basePriority.commit + Math.min(commit.changeCount / 10, 0.5),
    };
  });

const buildCatalogIndex = (
  entities: CatalogEntitySummary[],
  onSelect?: CatalogSelectHandler,
): SearchIndexItem[] =>
  entities.map((entity) => {
    const subtitleParts = [entity.type, entity.description].filter(Boolean);
    const subtitle = subtitleParts.join(' • ') || undefined;
    const keywords = [entity.name, entity.type];
    if (entity.description) {
      keywords.push(entity.description);
    }
    if (entity.sidebarId) {
      keywords.push(entity.sidebarId);
    }
    return {
      id: `catalog:${entity.id}`,
      title: entity.name,
      subtitle,
      kind: 'catalog',
      run: onSelect ? () => onSelect(entity) : undefined,
      searchValue: tokenize(keywords.join(' ')).join(' '),
      titleValue: normalize(entity.name),
      priority: basePriority.catalog,
    };
  });

const hasAllTokens = (haystack: string, tokens: string[]): boolean =>
  tokens.every((token) => haystack.includes(token));

const scoreToken = (item: SearchIndexItem, token: string): number => {
  let score = 1;
  if (item.titleValue.startsWith(token)) {
    score += 1.25;
  }
  if (item.kind === 'commit' && item.titleValue.includes(token)) {
    score += 0.5;
  }
  return score;
};

const scoreItem = (item: SearchIndexItem, tokens: string[]): number => {
  if (tokens.length === 0 || !hasAllTokens(item.searchValue, tokens)) {
    return 0;
  }
  return tokens.reduce((score, token) => score + scoreToken(item, token), item.priority);
};

function createState(): SearchStoreState {
  return { query: '', items: [], results: [] };
}

export interface SearchStoreActions {
  subscribe: (run: (value: SearchStoreState) => void) => () => void;
  setSidebarItems: (items: SidebarTreeNode[], onSelect?: SidebarSelectHandler) => void;
  setRecentCommits: (commits: TemporalCommitSummary[], onSelect?: CommitSelectHandler) => void;
  setCatalogEntities: (entities: CatalogEntitySummary[], onSelect?: CatalogSelectHandler) => void;
  search: (query: string, limit?: number) => SearchResult[];
  clear: () => void;
}

export function createSearchStore(): SearchStoreActions {
  const store = writable<SearchStoreState>(createState());
  const sources = new Map<SourceKey, SearchIndexItem[]>();

  const rebuildIndex = () => {
    const items = [...sources.values()].flat();
    store.update((state) => ({ ...state, items }));
  };

  const requeryIfNeeded = () => {
    const current = get(store);
    if (current.query.trim()) {
      search(current.query);
    }
  };

  const search = (query: string, limit = 10): SearchResult[] => {
    const normalizedTokens = tokenize(query.trim());
    const state = get(store);
    const scored: { item: SearchIndexItem; score: number }[] = [];
    if (normalizedTokens.length > 0) {
      for (const item of state.items) {
        const score = scoreItem(item, normalizedTokens);
        if (score > 0) {
          scored.push({ item, score });
        }
      }
    }
    scored.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.item.title.localeCompare(b.item.title);
    });
    const results = scored.slice(0, limit).map(({ item }) => ({
      id: item.id,
      title: item.title,
      subtitle: item.subtitle,
      kind: item.kind,
      run: item.run,
    }));
    store.set({ query, items: state.items, results });
    return results;
  };

  const clear = () => {
    store.update((state) => ({ ...state, query: '', results: [] }));
  };

  const setSource = (key: SourceKey, items: SearchIndexItem[]) => {
    sources.set(key, items);
    rebuildIndex();
    requeryIfNeeded();
  };

  return {
    subscribe: store.subscribe,
    setSidebarItems: (items, onSelect) => {
      setSource('sidebar', buildSidebarIndex(items, onSelect));
    },
    setRecentCommits: (commits, onSelect) => {
      setSource('commits', buildCommitIndex(commits, onSelect));
    },
    setCatalogEntities: (entities, onSelect) => {
      setSource('catalog', buildCatalogIndex(entities, onSelect));
    },
    search,
    clear,
  };
}

export const searchStore = createSearchStore();
