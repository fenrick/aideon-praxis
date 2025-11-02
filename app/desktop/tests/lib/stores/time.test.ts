import { get } from 'svelte/store';
import { describe, expect, it, vi } from 'vitest';

import type { TemporalPort } from '$lib/ports/temporal';
import { createTimeStore } from '$lib/stores/time';
import type {
  StateAtResult,
  TemporalCommitSummary,
  TemporalDiffSnapshot,
  TemporalMergeResult,
} from '$lib/types';

const snapshot: StateAtResult = {
  asOf: 'c2',
  scenario: 'main',
  confidence: null,
  nodes: 1,
  edges: 0,
};

const commits: TemporalCommitSummary[] = [
  {
    id: 'c1',
    branch: 'main',
    parents: [],
    time: '2025-01-01T00:00:00.000Z',
    message: 'init',
    tags: [],
    changeCount: 1,
  },
  {
    id: 'c2',
    branch: 'main',
    parents: ['c1'],
    time: '2025-02-01T00:00:00.000Z',
    message: 'update',
    tags: [],
    changeCount: 1,
  },
];

const diff: TemporalDiffSnapshot = {
  from: 'c1',
  to: 'c2',
  metrics: {
    nodeAdds: 1,
    nodeMods: 0,
    nodeDels: 0,
    edgeAdds: 0,
    edgeMods: 0,
    edgeDels: 0,
  },
};

const mergeOk: TemporalMergeResult = {
  result: 'c3',
};

const mergeConflicted: TemporalMergeResult = {
  conflicts: [{ reference: 'n1', kind: 'node', message: 'conflict' }],
};

const createMockPort = (
  overrides: Partial<TemporalPort> = {},
): { port: TemporalPort; mocks: Record<string, ReturnType<typeof vi.fn>> } => {
  const listBranchesMock = vi.fn(async () => [{ name: 'main', head: 'c2' }]);
  const listCommitsMock = vi.fn(async () => commits);
  const stateAtMock = vi.fn(async () => snapshot);
  const diffMock = vi.fn(async () => diff);
  const commitMock = vi.fn(async () => ({ id: 'c3' }));
  const createBranchMock = vi.fn(async () => ({ name: 'main', head: 'c2' }));
  const mergeMock = vi.fn(async () => mergeOk);

  const port: TemporalPort = {
    listBranches: overrides.listBranches ?? listBranchesMock,
    listCommits: overrides.listCommits ?? listCommitsMock,
    stateAt: overrides.stateAt ?? stateAtMock,
    diff: overrides.diff ?? diffMock,
    commit: overrides.commit ?? commitMock,
    createBranch: overrides.createBranch ?? createBranchMock,
    merge: overrides.merge ?? mergeMock,
  };

  return {
    port,
    mocks: {
      listBranches: listBranchesMock,
      listCommits: listCommitsMock,
      stateAt: stateAtMock,
      diff: diffMock,
      commit: commitMock,
      createBranch: createBranchMock,
      merge: mergeMock,
    },
  };
};

describe('time store', () => {
  it('loads commits and selects the latest snapshot', async () => {
    const { port, mocks } = createMockPort();

    const store = createTimeStore(port);
    await store.loadBranch('main');
    const state = get(store);

    expect(state.branch).toBe('main');
    expect(state.commits).toHaveLength(2);
    expect(state.branches[0]?.name).toBe('main');
    expect(state.currentCommitId).toBe('c2');
    expect(state.snapshot?.nodes).toBe(1);
    expect(mocks.listBranches).toHaveBeenCalled();
    expect(mocks.stateAt).toHaveBeenCalledWith({ asOf: 'c2', scenario: 'main' });
  });

  it('computes diff when starting compare', async () => {
    const customDiff: TemporalDiffSnapshot = {
      from: 'c1',
      to: 'c2',
      metrics: {
        nodeAdds: 2,
        nodeMods: 1,
        nodeDels: 0,
        edgeAdds: 0,
        edgeMods: 0,
        edgeDels: 0,
      },
    };
    const { port } = createMockPort({
      diff: vi.fn(async () => customDiff),
    });

    const store = createTimeStore(port);
    await store.loadBranch('main');
    await store.startCompare('c1', 'c2');

    const state = get(store);
    expect(state.isComparing).toBe(true);
    expect(state.diff?.metrics.nodeAdds).toBe(2);
  });

  it('clears comparison state', async () => {
    const { port } = createMockPort();
    const store = createTimeStore(port);
    await store.loadBranch('main');
    await store.startCompare('c1', 'c2');
    store.clearCompare();
    const state = get(store);

    expect(state.isComparing).toBe(false);
    expect(state.diff).toBeNull();
  });

  it('records merge conflicts', async () => {
    const { port } = createMockPort({
      merge: vi.fn(async () => mergeConflicted),
    });

    const store = createTimeStore(port);
    await store.loadBranch('main');
    await store.mergeBranches('feature', 'main');
    const state = get(store);
    expect(state.mergeConflicts?.[0]?.reference).toBe('n1');
    expect(state.error).toBe('Merge requires manual resolution.');
  });

  it('clears conflicts on successful merge', async () => {
    const { port } = createMockPort({
      merge: vi.fn(async () => mergeOk),
    });
    const store = createTimeStore(port);
    await store.loadBranch('main');
    await store.mergeBranches('feature', 'main');
    const state = get(store);
    expect(state.mergeConflicts).toBeNull();
  });
});
