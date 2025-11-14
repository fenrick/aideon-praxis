import { get, writable } from 'svelte/store';

import type { SidebarTreeNode } from '../components/sidebar.types.js';
import type { TemporalCommitSummary } from '../types.js';

import {
  buildCatalogIndex,
  buildCommitIndex,
  buildSidebarIndex,
  scoreItem,
  tokenize,
} from './search-index.js';
import type {
  CatalogEntitySummary,
  CatalogSelectHandler,
  CommitSelectHandler,
  SearchIndexItem,
  SearchResult,
  SidebarSelectHandler,
  SourceKey,
} from './search.types.js';

export type { CatalogEntitySummary, SearchResult, SearchResultKind } from './search.types.js';

export interface SearchStoreState {
  query: string;
  items: SearchIndexItem[];
  results: SearchResult[];
}

export interface SearchStoreActions {
  subscribe: (run: (value: SearchStoreState) => void) => () => void;
  setSidebarItems: (items: SidebarTreeNode[], onSelect?: SidebarSelectHandler) => void;
  setRecentCommits: (commits: TemporalCommitSummary[], onSelect?: CommitSelectHandler) => void;
  setCatalogEntities: (entities: CatalogEntitySummary[], onSelect?: CatalogSelectHandler) => void;
  search: (query: string, limit?: number) => SearchResult[];
  clear: () => void;
}

function createState(): SearchStoreState {
  return { query: '', items: [], results: [] };
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
    const normalizedTokens = Array.from(tokenize(query.trim()));
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
