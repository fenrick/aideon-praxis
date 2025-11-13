import { describe, expect, it, vi } from 'vitest';

import {
  buildCatalogIndex,
  buildCommitIndex,
  buildSidebarIndex,
  scoreItem,
  tokenize,
} from '$lib/stores/search-index';
import type { CatalogEntitySummary } from '$lib/stores/search';

describe('search index utilities', () => {
  it('normalizes casing, diacritics and spacing', () => {
    const tokens = tokenize('  Héllö  World  ');
    expect(tokens).toEqual(['hello', 'world']);
  });

  it('creates sidebar entries with hierarchical priorities', () => {
    const onSelect = vi.fn();
    const entries = buildSidebarIndex(
      [
        {
          id: 'root',
          label: 'Root',
          children: [
            {
              id: 'child',
              label: 'Child',
            },
          ],
        },
      ],
      onSelect,
    );
    expect(entries).toHaveLength(2);
    const [root, child] = entries;
    expect(child.priority).toBeGreaterThan(root.priority);
    expect(Array.from(child.tokenSet)).toContain('child');
    child.run?.();
    expect(onSelect).toHaveBeenCalledWith('child');
  });

  it('creates commit entries with change count priority bonus', () => {
    const entries = buildCommitIndex(
      [
        {
          id: 'c1',
          parents: [],
          branch: 'main',
          message: 'Initial Commit',
          tags: [],
          changeCount: 25,
          author: 'Ada',
          time: '2024-05-01T12:00:00Z',
        },
      ],
      undefined,
    );
    expect(entries[0]?.priority).toBeCloseTo(1.0); // 0.5 base + 0.5 bonus
    expect(entries[0]?.tokens).toContain('initial');
  });

  it('creates catalog entries with optional sidebar targeting', () => {
    const onSelect = vi.fn();
    const catalog: CatalogEntitySummary[] = [
      {
        id: 'entity-1',
        name: 'API Gateway',
        type: 'Service',
        description: 'Routes requests',
        sidebarId: 'node-1',
      },
    ];
    const entries = buildCatalogIndex(catalog, onSelect);
    expect(entries[0]?.tokens).toContain('service');
    entries[0]?.run?.();
    expect(onSelect).toHaveBeenCalledWith(catalog[0]);
  });

  it('scores entries only when all tokens are present', () => {
    const [entry] = buildCatalogIndex(
      [
        {
          id: 'catalog-1',
          name: 'Data Lake',
          type: 'Storage',
        },
      ],
      undefined,
    );
    expect(scoreItem(entry, ['missing'])).toBe(0);
    const score = scoreItem(entry, ['data']);
    expect(score).toBeGreaterThan(entry.priority + 1);
  });
});
