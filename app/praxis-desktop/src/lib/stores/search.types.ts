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

export interface SearchIndexItem extends SearchResult {
  /** Normalized tokens used to match search queries. */
  tokens: readonly string[];
  /** Precomputed set for token lookups to speed up query evaluation. */
  tokenSet: ReadonlySet<string>;
  /** Concatenated normalized string used for substring matching. */
  searchValue: string;
  /** Normalized title string used to compute scoring bonuses. */
  titleValue: string;
  /** Base priority applied before token scoring. */
  priority: number;
}

export type SidebarSelectHandler = (id: string) => void | Promise<void>;
export type CommitSelectHandler = (id: string) => void | Promise<void>;
export type CatalogSelectHandler = (
  entity: CatalogEntitySummary,
) => void | Promise<void>;

export type SourceKey = 'sidebar' | 'commits' | 'catalog';

export interface SearchSourceBuilders {
  sidebar: (
    items: SidebarTreeNode[],
    onSelect?: SidebarSelectHandler,
  ) => SearchIndexItem[];
  commits: (
    commits: TemporalCommitSummary[],
    onSelect?: CommitSelectHandler,
  ) => SearchIndexItem[];
  catalog: (
    entities: CatalogEntitySummary[],
    onSelect?: CatalogSelectHandler,
  ) => SearchIndexItem[];
}
