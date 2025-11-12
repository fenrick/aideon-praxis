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
  nodes: 5,
  edges: 4,
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
  const topologyDeltaMock = vi.fn(async () => ({
    from: 'c1',
    to: 'c2',
    metrics: {
      nodeAdds: 0,
      nodeDels: 0,
      edgeAdds: 0,
      edgeDels: 0,
    },
  }));
  const commitMock = vi.fn(async () => ({ id: 'c3' }));
  const createBranchMock = vi.fn(async () => ({ name: 'main', head: 'c2' }));
  const mergeMock = vi.fn(async () => mergeOk);

  const port: TemporalPort = {
    listBranches: overrides.listBranches ?? listBranchesMock,
    listCommits: overrides.listCommits ?? listCommitsMock,
    stateAt: overrides.stateAt ?? stateAtMock,
    diff: overrides.diff ?? diffMock,
    topologyDelta: overrides.topologyDelta ?? topologyDeltaMock,
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
      topologyDelta: topologyDeltaMock,
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
    expect(state.snapshot?.nodes ?? 0).toBeGreaterThan(0);
    expect(state.snapshot?.edges ?? 0).toBeGreaterThan(0);
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

  it('selectCommit noop when id unchanged', async () => {
    const { port, mocks } = createMockPort();
    const store = createTimeStore(port);
    await store.loadBranch('main');
    await store.selectCommit('c2');
    expect(mocks.stateAt).toHaveBeenCalledTimes(1);
  });

  it('selectCommit clears when null provided', async () => {
    const { port } = createMockPort();
    const store = createTimeStore(port);
    await store.loadBranch('main');
    await store.selectCommit(null);
    expect(get(store).currentCommitId).toBeNull();
    expect(get(store).snapshot).toBeNull();
  });

  it('handles refreshBranches errors without crashing', async () => {
    const { port } = createMockPort({
      listBranches: vi.fn(async () => {
        throw new Error('network');
      }),
    });
    const store = createTimeStore(port);
    await store.loadBranch('main');
    await store.refreshBranches();
    expect(get(store).error).toBe('network');
  });

  it('startCompare clears when ids match', async () => {
    const { port } = createMockPort();
    const store = createTimeStore(port);
    await store.loadBranch('main');
    await store.startCompare('c2', 'c2');
    const state = get(store);
    expect(state.isComparing).toBe(false);
    expect(state.compare.from).toBeNull();
  });

  it('setUnsavedCount clamps negative values to zero', async () => {
    const { port } = createMockPort();
    const store = createTimeStore(port);
    store.setUnsavedCount(-4);
    expect(get(store).unsavedCount).toBe(0);
  });

  it('mergeBranches surfaces adapter errors', async () => {
    const { port } = createMockPort({
      merge: vi.fn(async () => {
        throw new Error('merge failed');
      }),
    });
    const store = createTimeStore(port);
    await store.loadBranch('main');
    await store.mergeBranches('feature', 'main');
    expect(get(store).error).toBe('merge failed');
  });

  it('loadBranch records adapter failures', async () => {
    const { port } = createMockPort({
      listBranches: vi.fn(async () => {
        throw new Error('boom');
      }),
    });
    const store = createTimeStore(port);
    await store.loadBranch('main');
    expect(get(store).error).toBe('boom');
  });

  it('selectCommit warns when commit missing and ignores request', async () => {
    const { port } = createMockPort();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const store = createTimeStore(port);
    await store.loadBranch('main');
    await store.selectCommit('nope');
    expect(warn).toHaveBeenCalledWith('timeStore.selectCommit: commit nope not found');
    warn.mockRestore();
  });

  it('captures adapter errors when selecting commit', async () => {
    const { port } = createMockPort({
      stateAt: vi.fn(async () => {
        throw new Error('state failed');
      }),
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const store = createTimeStore(port);
    await store.loadBranch('main');
    await store.selectCommit('c2');
    expect(get(store).error).toBe('state failed');
    warn.mockRestore();
  });

  it('captures adapter errors when diff fails', async () => {
    const { port } = createMockPort({
      diff: vi.fn(async () => {
        throw new Error('diff failed');
      }),
    });
    const store = createTimeStore(port);
    await store.loadBranch('main');
    await store.startCompare('c1', 'c2');
    expect(get(store).error).toBe('diff failed');
  });
});
