import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  StateAtSnapshot,
  TemporalBranchSummary,
  TemporalCommitSummary,
  TemporalMergeResult,
} from '@/praxis-api';
import type { TemporalPanelActions, TemporalPanelState } from '@/time/use-temporal-panel';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function flushMicrotasks(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
  });
}

async function waitForState(predicate: () => boolean, retries = 10): Promise<void> {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    await flushMicrotasks();
    if (predicate()) {
      return;
    }
  }
  throw new Error('State condition not met');
}

type BranchesMock = () => Promise<TemporalBranchSummary[]>;
type CommitsMock = (branch: string) => Promise<TemporalCommitSummary[]>;
type SnapshotMock = (request: { asOf: string; scenario?: string }) => Promise<StateAtSnapshot>;
type MergeMock = (request: {
  source: string;
  target: string;
  strategy?: string;
}) => Promise<TemporalMergeResult>;

const listBranchesSpy = vi.fn<Parameters<BranchesMock>, ReturnType<BranchesMock>>();
const listCommitsSpy = vi.fn<Parameters<CommitsMock>, ReturnType<CommitsMock>>();
const getSnapshotSpy = vi.fn<Parameters<SnapshotMock>, ReturnType<SnapshotMock>>();
const mergeSpy = vi.fn<Parameters<MergeMock>, ReturnType<MergeMock>>();

vi.mock('@/praxis-api', () => ({
  listTemporalBranches: (...args: Parameters<typeof listBranchesSpy>) => listBranchesSpy(...args),
  listTemporalCommits: (...args: Parameters<typeof listCommitsSpy>) => listCommitsSpy(...args),
  getStateAtSnapshot: (...args: Parameters<typeof getSnapshotSpy>) => getSnapshotSpy(...args),
  mergeTemporalBranches: (...args: Parameters<typeof mergeSpy>) => mergeSpy(...args),
}));

import { useTemporalPanel } from '@/time/use-temporal-panel';

const MAIN_COMMITS: TemporalCommitSummary[] = [
  {
    id: 'commit-main-001',
    branch: 'main',
    parents: [],
    author: 'Chrona',
    message: 'Seed',
    tags: [],
    changeCount: 2,
  },
  {
    id: 'commit-main-002',
    branch: 'main',
    parents: ['commit-main-001'],
    author: 'Chrona',
    message: 'Initial rollout',
    tags: ['baseline'],
    changeCount: 5,
  },
];

const FEATURE_COMMITS: TemporalCommitSummary[] = [
  {
    id: 'commit-feature-001',
    branch: 'chronaplay',
    parents: ['commit-main-002'],
    author: 'Metis',
    message: 'Scenario punch list',
    tags: [],
    changeCount: 1,
  },
];

const SNAPSHOTS: Record<string, StateAtSnapshot> = {
  'commit-main-001': {
    asOf: 'commit-main-001',
    scenario: 'main',
    confidence: 0.9,
    nodes: 12,
    edges: 18,
  },
  'commit-main-002': {
    asOf: 'commit-main-002',
    scenario: 'main',
    confidence: 0.95,
    nodes: 20,
    edges: 28,
  },
  'commit-feature-001': {
    asOf: 'commit-feature-001',
    scenario: 'chronaplay',
    confidence: 0.8,
    nodes: 22,
    edges: 31,
  },
};

function renderTemporalPanelHook() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  let current: [TemporalPanelState, TemporalPanelActions] | undefined;

  function HookBridge() {
    current = useTemporalPanel();
    return null;
  }

  act(() => {
    root.render(createElement(HookBridge));
  });

  const getCurrent = () => {
    if (!current) {
      throw new Error('Hook has not initialised yet');
    }
    return current;
  };

  return {
    get state() {
      return getCurrent()[0];
    },
    get actions() {
      return getCurrent()[1];
    },
    unmount() {
      act(() => root.unmount());
      container.remove();
    },
  };
}

describe('useTemporalPanel', () => {
  beforeEach(() => {
    listBranchesSpy.mockReset();
    listCommitsSpy.mockReset();
    getSnapshotSpy.mockReset();
    mergeSpy.mockReset();

    listBranchesSpy.mockResolvedValue([
      { name: 'main', head: 'commit-main-002' },
      { name: 'chronaplay', head: 'commit-feature-001' },
    ]);

    listCommitsSpy.mockImplementation(async (branch: string) => {
      if (branch === 'main') {
        return MAIN_COMMITS;
      }
      if (branch === 'chronaplay') {
        return FEATURE_COMMITS;
      }
      return [];
    });

    getSnapshotSpy.mockImplementation(async ({ asOf }) => {
      const snapshot = SNAPSHOTS[asOf];
      if (!snapshot) {
        throw new Error(`Missing snapshot for ${asOf}`);
      }
      return snapshot;
    });

    mergeSpy.mockResolvedValue({ result: 'merged' });
  });

  it('loads branches, commits, and latest snapshot on mount', async () => {
    const harness = renderTemporalPanelHook();
    try {
      await waitForState(() => harness.state.loading === false);

      expect(harness.state.branch).toBe('main');
      expect(harness.state.commitId).toBe('commit-main-002');
      expect(harness.state.snapshot).toEqual(SNAPSHOTS['commit-main-002']);
      expect(listBranchesSpy).toHaveBeenCalledTimes(1);
      expect(listCommitsSpy).toHaveBeenCalledWith('main');
    } finally {
      harness.unmount();
    }
  });

  it('fetches snapshots when selecting historical commits', async () => {
    const harness = renderTemporalPanelHook();
    try {
      await waitForState(() => harness.state.commitId === 'commit-main-002');

      getSnapshotSpy.mockClear();
      getSnapshotSpy.mockResolvedValueOnce(SNAPSHOTS['commit-main-001']);

      act(() => {
        harness.actions.selectCommit('commit-main-001');
      });

      await waitForState(() => harness.state.commitId === 'commit-main-001');
      await waitForState(() => harness.state.snapshot?.asOf === 'commit-main-001');
      expect(getSnapshotSpy).toHaveBeenCalledWith({ asOf: 'commit-main-001', scenario: 'main' });
      expect(harness.state.snapshot).toEqual(SNAPSHOTS['commit-main-001']);
    } finally {
      harness.unmount();
    }
  });

  it('surfaces merge conflicts when the worker rejects a merge', async () => {
    const harness = renderTemporalPanelHook();
    try {
      await waitForState(() => harness.state.loading === false);

      act(() => {
        harness.actions.selectBranch('chronaplay');
      });

      await waitForState(() => harness.state.branch === 'chronaplay');

      mergeSpy.mockResolvedValueOnce({
        result: 'conflicts',
        conflicts: [
          {
            reference: 'cap-customer-onboarding',
            kind: 'node',
            message: 'Conflicting capability',
          },
        ],
      });

      act(() => {
        harness.actions.mergeIntoMain();
      });

      await waitForState(() => harness.state.merging === false);
      expect(mergeSpy).toHaveBeenCalledWith({ source: 'chronaplay', target: 'main' });
      expect(harness.state.mergeConflicts).toEqual([
        {
          reference: 'cap-customer-onboarding',
          kind: 'node',
          message: 'Conflicting capability',
        },
      ]);
    } finally {
      harness.unmount();
    }
  });

  it('stores errors when branch loading fails', async () => {
    listBranchesSpy.mockRejectedValueOnce(new Error('network down'));

    const harness = renderTemporalPanelHook();
    try {
      await waitForState(() => harness.state.loading === false);
      expect(harness.state.error).toContain('network down');
    } finally {
      harness.unmount();
    }
  });
});
