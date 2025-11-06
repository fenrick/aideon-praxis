import { get, writable } from 'svelte/store';

import type { TemporalPort } from '../ports/temporal.js';
import { temporalPort } from '../ports/temporal.js';
import type {
  StateAtResult,
  TemporalBranchSummary,
  TemporalCommitSummary,
  TemporalDiffSnapshot,
  TemporalMergeConflict,
} from '../types.js';

export interface TimeStoreState {
  branch: string;
  commits: TemporalCommitSummary[];
  branches: TemporalBranchSummary[];
  currentCommitId: string | null;
  snapshot: StateAtResult | null;
  diff: TemporalDiffSnapshot | null;
  isComparing: boolean;
  compare: { from: string | null; to: string | null };
  unsavedCount: number;
  loading: boolean;
  error: string | null;
  lastUpdated?: number;
  mergeConflicts: TemporalMergeConflict[] | null;
}

const initialState: TimeStoreState = {
  branch: 'main',
  commits: [],
  branches: [],
  currentCommitId: null,
  snapshot: null,
  diff: null,
  isComparing: false,
  compare: { from: null, to: null },
  unsavedCount: 0,
  loading: false,
  error: null,
  mergeConflicts: null,
};

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error';
};

export interface TimeStoreActions {
  subscribe: (run: (value: TimeStoreState) => void) => () => void;
  loadBranch(branch: string): Promise<void>;
  refreshBranches(): Promise<void>;
  selectCommit(commitId: string | null): Promise<void>;
  startCompare(fromId: string, toId: string): Promise<void>;
  clearCompare(): void;
  setUnsavedCount(count: number): void;
  mergeBranches(source: string, target: string): Promise<void>;
}

export function createTimeStore(port: TemporalPort = temporalPort): TimeStoreActions {
  const adapter: TemporalPort = port;
  // To-do: replace adapter with dependency injection once multiple temporal providers exist.
  const store = writable<TimeStoreState>({ ...initialState });

  async function loadBranch(branch: string): Promise<void> {
    store.update((state) => ({
      ...state,
      branch,
      loading: true,
      error: null,
      commits: [],
      branches: state.branches,
      currentCommitId: null,
      snapshot: null,
      diff: null,
      compare: { from: null, to: null },
      mergeConflicts: null,
    }));

    try {
      const [branches, commits]: [TemporalBranchSummary[], TemporalCommitSummary[]] =
        await Promise.all([adapter.listBranches(), adapter.listCommits(branch)]);
      const selected: TemporalCommitSummary | null = commits.at(-1) ?? null;
      const snapshot: StateAtResult | null = selected
        ? await adapter.stateAt({ asOf: selected.id, scenario: branch })
        : null;
      store.set({
        branch,
        commits,
        branches,
        currentCommitId: selected?.id ?? null,
        snapshot,
        diff: null,
        isComparing: false,
        compare: { from: null, to: null },
        unsavedCount: 0,
        loading: false,
        error: null,
        lastUpdated: Date.now(),
        mergeConflicts: null,
      });
    } catch (error: unknown) {
      const message = toErrorMessage(error);
      store.update((state) => ({
        ...state,
        loading: false,
        error: message,
        mergeConflicts: null,
      }));
    }
  }

  async function refreshBranches(): Promise<void> {
    try {
      const branches: TemporalBranchSummary[] = await adapter.listBranches();
      store.update((state) => ({
        ...state,
        branches,
      }));
    } catch (error: unknown) {
      store.update((state) => ({
        ...state,
        error: toErrorMessage(error),
      }));
    }
  }

  async function selectCommit(commitId: string | null): Promise<void> {
    const state = get(store);
    if (commitId === state.currentCommitId) {
      return;
    }
    if (!commitId) {
      store.update((current) => ({
        ...current,
        currentCommitId: null,
        snapshot: null,
        diff: null,
        isComparing: false,
        compare: { from: null, to: null },
        mergeConflicts: null,
      }));
      return;
    }
    const commit = state.commits.find((item) => item.id === commitId);
    if (!commit) {
      console.warn(`timeStore.selectCommit: commit ${commitId} not found`);
      return;
    }
    try {
      const snapshot: StateAtResult = await adapter.stateAt({
        asOf: commit.id,
        scenario: state.branch,
      });
      store.update((current) => ({
        ...current,
        currentCommitId: commitId,
        snapshot,
        diff: current.isComparing ? current.diff : null,
        lastUpdated: Date.now(),
        error: null,
        mergeConflicts: null,
      }));
    } catch (error: unknown) {
      const message = toErrorMessage(error);
      store.update((current) => ({
        ...current,
        error: message,
        mergeConflicts: null,
      }));
    }
  }

  async function startCompare(fromId: string, toId: string): Promise<void> {
    if (fromId === toId) {
      store.update((current) => ({
        ...current,
        isComparing: false,
        compare: { from: null, to: null },
        diff: null,
        mergeConflicts: current.mergeConflicts,
      }));
      return;
    }
    try {
      const diff: TemporalDiffSnapshot = await adapter.diff({ from: fromId, to: toId });
      store.update((current) => ({
        ...current,
        isComparing: true,
        compare: { from: fromId, to: toId },
        diff,
        error: null,
        lastUpdated: Date.now(),
        mergeConflicts: null,
      }));
    } catch (error: unknown) {
      const message = toErrorMessage(error);
      store.update((current) => ({
        ...current,
        error: message,
        mergeConflicts: null,
      }));
    }
  }

  function clearCompare(): void {
    store.update((current) => ({
      ...current,
      isComparing: false,
      compare: { from: null, to: null },
      diff: null,
    }));
  }

  function setUnsavedCount(count: number): void {
    store.update((current) => ({
      ...current,
      unsavedCount: Math.max(0, count),
    }));
  }

  async function mergeBranches(source: string, target: string): Promise<void> {
    try {
      const response = await adapter.merge({ source, target });
      if (response.conflicts && response.conflicts.length > 0) {
        const conflicts: TemporalMergeConflict[] = [...response.conflicts];
        store.update((current) => ({
          ...current,
          mergeConflicts: conflicts,
          error: 'Merge requires manual resolution.',
        }));
        return;
      }
      await loadBranch(target);
      store.update((current) => ({
        ...current,
        mergeConflicts: null,
      }));
    } catch (error: unknown) {
      store.update((current) => ({
        ...current,
        error: toErrorMessage(error),
        mergeConflicts: null,
      }));
    }
  }

  return {
    subscribe: store.subscribe,
    loadBranch,
    refreshBranches,
    selectCommit,
    startCompare,
    clearCompare,
    setUnsavedCount,
    mergeBranches,
  };
}

export const timeStore = createTimeStore();
