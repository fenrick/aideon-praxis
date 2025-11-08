import { describe, expect, it, vi } from 'vitest';

import type { SidebarTreeNode } from '$lib/components/sidebar.types.js';
import { createSearchStore, type CatalogEntitySummary } from '$lib/stores/search';
import type { TemporalCommitSummary } from '$lib/types';

describe('search store', () => {
  const sidebarTree: SidebarTreeNode[] = [
    {
      id: 'workspace',
      label: 'Workspace',
      children: [
        { id: 'overview', label: 'Overview' },
        { id: 'timeline', label: 'Timeline' },
      ],
    },
    { id: 'about', label: 'About Praxis' },
  ];

  const commits: TemporalCommitSummary[] = [
    {
      id: 'c1',
      branch: 'main',
      parents: [],
      message: 'Initial ingest',
      tags: [],
      changeCount: 4,
      time: '2024-01-01T00:00:00.000Z',
    },
    {
      id: 'c2',
      branch: 'main',
      parents: ['c1'],
      message: 'Add timeline filters',
      tags: ['timeline'],
      changeCount: 7,
      time: '2024-01-02T00:00:00.000Z',
    },
  ];

  const catalog: CatalogEntitySummary[] = [
    {
      id: 'catalog-applications',
      name: 'Applications Catalogue',
      type: 'Catalogue',
      description: 'Service inventory by owner',
      sidebarId: 'applications',
    },
    {
      id: 'catalog-schema',
      name: 'Praxis Schema Reference',
      type: 'Reference',
      description: 'Meta-model documentation',
      sidebarId: 'metamodel',
    },
  ];

  it('indexes sidebar nodes and invokes selection callbacks', async () => {
    const store = createSearchStore();
    const onSelect = vi.fn();

    store.setSidebarItems(sidebarTree, onSelect);
    const results = store.search('timeline');

    expect(results[0]?.id).toBe('sidebar:timeline');
    await results[0]?.run?.();
    expect(onSelect).toHaveBeenCalledWith('timeline');
  });

  it('prioritises prefix matches when scoring results', () => {
    const store = createSearchStore();
    store.setSidebarItems(sidebarTree);
    store.setRecentCommits(commits);

    const results = store.search('add');
    expect(results[0]?.id).toBe('commit:c2');
    expect(results.some((item) => item.id === 'sidebar:about')).toBe(false);
  });

  it('searches catalog entities with descriptive tokens', async () => {
    const store = createSearchStore();
    const onOpen = vi.fn();
    store.setCatalogEntities(catalog, onOpen);

    const results = store.search('schema');
    expect(results[0]?.id).toBe('catalog:catalog-schema');
    await results[0]?.run?.();
    expect(onOpen).toHaveBeenCalledWith(catalog[1]);
  });

  it('clears the current query without dropping the index', () => {
    const store = createSearchStore();
    store.setSidebarItems(sidebarTree);
    store.search('overview');

    let snapshot = { query: '', results: [] };
    const unsubscribe = store.subscribe((state) => {
      snapshot = state;
    });

    store.clear();
    expect(snapshot.query).toBe('');
    expect(snapshot.results).toHaveLength(0);

    const results = store.search('timeline');
    expect(results[0]?.id).toBe('sidebar:timeline');
    unsubscribe();
  });
});
