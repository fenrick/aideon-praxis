import { get, writable } from 'svelte/store';

import type { TemporalPort } from '../ports/temporal.js';
import { temporalPort } from '../ports/temporal.js';
import type { StateAtResult, TemporalCommitSummary, TemporalDiffSnapshot } from '../types.js';

export interface TimeStoreState {
  branch: string;
  commits: TemporalCommitSummary[];
  currentCommitId: string | null;
  snapshot: StateAtResult | null;
  diff: TemporalDiffSnapshot | null;
  isComparing: boolean;
  compare: { from: string | null; to: string | null };
  unsavedCount: number;
  loading: boolean;
  error: string | null;
  lastUpdated?: number;
}

const initialState: TimeStoreState = {
  branch: 'main',
  commits: [],
  currentCommitId: null,
  snapshot: null,
  diff: null,
  isComparing: false,
  compare: { from: null, to: null },
  unsavedCount: 0,
  loading: false,
  error: null,
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
  selectCommit(commitId: string | null): Promise<void>;
  startCompare(fromId: string, toId: string): Promise<void>;
  clearCompare(): void;
  setUnsavedCount(count: number): void;
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
      currentCommitId: null,
      snapshot: null,
      diff: null,
      compare: { from: null, to: null },
    }));

    try {
      const commits = await adapter.listCommits(branch);
      const selected = commits.at(-1) ?? null;
      const snapshot = selected
        ? await adapter.stateAt({ asOf: selected.asOf, scenario: branch })
        : null;
      store.set({
        branch,
        commits,
        currentCommitId: selected?.id ?? null,
        snapshot,
        diff: null,
        isComparing: false,
        compare: { from: null, to: null },
        unsavedCount: 0,
        loading: false,
        error: null,
        lastUpdated: Date.now(),
      });
    } catch (error: unknown) {
      const message = toErrorMessage(error);
      store.update((state) => ({
        ...state,
        loading: false,
        error: message,
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
      }));
      return;
    }
    const commit = state.commits.find((item) => item.id === commitId);
    if (!commit) {
      console.warn(`timeStore.selectCommit: commit ${commitId} not found`);
      return;
    }
    try {
      const snapshot = await adapter.stateAt({ asOf: commit.asOf, scenario: state.branch });
      store.update((current) => ({
        ...current,
        currentCommitId: commitId,
        snapshot,
        diff: current.isComparing ? current.diff : null,
        lastUpdated: Date.now(),
        error: null,
      }));
    } catch (error: unknown) {
      const message = toErrorMessage(error);
      store.update((current) => ({
        ...current,
        error: message,
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
      }));
      return;
    }
    try {
      const diff = await adapter.diff({ from: fromId, to: toId });
      store.update((current) => ({
        ...current,
        isComparing: true,
        compare: { from: fromId, to: toId },
        diff,
        error: null,
        lastUpdated: Date.now(),
      }));
    } catch (error: unknown) {
      const message = toErrorMessage(error);
      store.update((current) => ({
        ...current,
        error: message,
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

  return {
    subscribe: store.subscribe,
    loadBranch,
    selectCommit,
    startCompare,
    clearCompare,
    setUnsavedCount,
  };
}

export const timeStore = createTimeStore();
