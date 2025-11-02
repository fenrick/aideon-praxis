import { describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';

import { createTimeStore } from '$lib/stores/time';

const snapshot = {
  asOf: '2025-01-01',
  scenario: 'main',
  confidence: null,
  nodes: 1,
  edges: 0,
};

const commits = [
  { id: 'c1', branch: 'main', asOf: '2025-01-01T00:00:00.000Z' },
  { id: 'c2', branch: 'main', asOf: '2025-02-01T00:00:00.000Z' },
];

describe('time store', () => {
  it('loads commits and selects the latest snapshot', async () => {
    const port = {
      listCommits: vi.fn().mockResolvedValue(commits),
      stateAt: vi.fn().mockResolvedValue(snapshot),
      diff: vi.fn().mockResolvedValue({
        from: 'c1',
        to: 'c2',
        metrics: { nodesAdded: 1, nodesRemoved: 0, edgesAdded: 0, edgesRemoved: 0 },
      }),
      commit: vi.fn().mockResolvedValue({ id: 'c3' }),
      createBranch: vi.fn().mockResolvedValue({ name: 'main', head: 'c2' }),
    } satisfies Parameters<typeof createTimeStore>[0];

    const store = createTimeStore(port);
    await store.loadBranch('main');
    const state = get(store);

    expect(state.branch).toBe('main');
    expect(state.commits).toHaveLength(2);
    expect(state.currentCommitId).toBe('c2');
    expect(state.snapshot?.nodes).toBe(1);
    expect(port.stateAt).toHaveBeenCalledWith({ asOf: expect.any(String), scenario: 'main' });
  });

  it('computes diff when starting compare', async () => {
    const port = {
      listCommits: vi.fn().mockResolvedValue(commits),
      stateAt: vi.fn().mockResolvedValue(snapshot),
      diff: vi.fn().mockResolvedValue({
        from: 'c1',
        to: 'c2',
        metrics: { nodesAdded: 2, nodesRemoved: 1, edgesAdded: 0, edgesRemoved: 0 },
      }),
      commit: vi.fn().mockResolvedValue({ id: 'c3' }),
      createBranch: vi.fn().mockResolvedValue({ name: 'main', head: 'c2' }),
    } satisfies Parameters<typeof createTimeStore>[0];

    const store = createTimeStore(port);
    await store.loadBranch('main');
    await store.startCompare('c1', 'c2');

    const state = get(store);
    expect(state.isComparing).toBe(true);
    expect(state.diff?.metrics.nodesAdded).toBe(2);
  });

  it('clears comparison state', async () => {
    const port = {
      listCommits: vi.fn().mockResolvedValue(commits),
      stateAt: vi.fn().mockResolvedValue(snapshot),
      diff: vi.fn().mockResolvedValue({
        from: 'c1',
        to: 'c2',
        metrics: { nodesAdded: 2, nodesRemoved: 0, edgesAdded: 0, edgesRemoved: 0 },
      }),
      commit: vi.fn().mockResolvedValue({ id: 'c3' }),
      createBranch: vi.fn().mockResolvedValue({ name: 'main', head: 'c2' }),
    } satisfies Parameters<typeof createTimeStore>[0];

    const store = createTimeStore(port);
    await store.loadBranch('main');
    await store.startCompare('c1', 'c2');
    store.clearCompare();
    const state = get(store);

    expect(state.isComparing).toBe(false);
    expect(state.diff).toBeNull();
  });
});
