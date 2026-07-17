import { useTranslations } from 'next-intl';
import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  getStateAtSnapshot,
  getTemporalDiff,
  listTemporalBranches,
  listTemporalCommits,
  mergeTemporalBranches,
  type StateAtSnapshot,
  type TemporalBranchSummary,
  type TemporalCommitSummary,
  type TemporalDiffSnapshot,
  type TemporalMergeConflict,
} from 'praxis/praxis-api';

import type { Layer } from 'dtos';
import { toErrorMessage } from 'praxis/lib/errors';

export interface TemporalPanelState {
  readonly branches: TemporalBranchSummary[];
  readonly branch?: string;
  readonly commits: TemporalCommitSummary[];
  readonly commitId?: string;
  readonly snapshot?: StateAtSnapshot;
  readonly layer: Layer;
  readonly loading: boolean;
  readonly snapshotLoading: boolean;
  readonly error?: string;
  readonly mergeConflicts?: TemporalMergeConflict[];
  readonly merging: boolean;
  readonly diff?: TemporalDiffSnapshot;
}

export interface TemporalPanelActions {
  readonly selectBranch: (branch: string) => Promise<void>;
  readonly selectCommit: (commitId?: string) => void;
  readonly selectLayer: (layer: Layer) => void;
  readonly refreshBranches: () => Promise<void>;
  readonly mergeIntoMain: () => Promise<void>;
}

const INITIAL_STATE: TemporalPanelState = {
  branches: [],
  commits: [],
  loading: true,
  snapshotLoading: false,
  mergeConflicts: undefined,
  merging: false,
  diff: undefined,
  layer: 'Plan',
};

type SetTemporalPanelState = Dispatch<SetStateAction<TemporalPanelState>>;
type ReadLayer = () => Layer;
type WriteLayer = (layer: Layer) => void;
type LoadCommits = (commits: TemporalCommitSummary[]) => Promise<void>;
type LoadBranch = (branch: string) => Promise<void>;
type LoadBranches = () => Promise<void>;

/**
 * Hook backing the temporal panel: timelines, moments, snapshots, apply-to-primary, and diff preview.
 * @returns {[TemporalPanelState, TemporalPanelActions]} current state and actions
 */
export function useTemporalPanel(): [TemporalPanelState, TemporalPanelActions] {
  const t = useTranslations('engines.praxis.temporalPanel');
  const [state, setState] = useState<TemporalPanelState>(INITIAL_STATE);
  const layerReference = useRef<Layer>(INITIAL_STATE.layer);
  const readLayer = useCallback<ReadLayer>(() => layerReference.current, []);
  const writeLayer = useCallback<WriteLayer>((layer: Layer) => {
    layerReference.current = layer;
  }, []);

  const loadDiff = useLoadDiff(setState);
  const loadBranch = useLoadBranch(setState, readLayer, loadDiff);
  const loadBranches = useLoadBranches(setState, loadBranch);

  const selectCommit = useSelectCommit(setState, readLayer, state.branch, state.commitId);
  const selectLayer = useSelectLayer(setState, writeLayer, state.branch, state.commitId);
  const mergeIntoMain = useMergeIntoMain(setState, loadBranches, state.branch, t);

  const refreshBranches = useCallback(async () => {
    await loadBranches();
  }, [loadBranches]);

  const selectBranch = useCallback(
    async (branch: string) => {
      await loadBranch(branch);
    },
    [loadBranch],
  );

  useEffect(() => {
    loadBranches().catch((_ignoredError: unknown) => {
      return;
    });
  }, [loadBranches]);

  return [
    state,
    {
      selectBranch,
      selectCommit,
      selectLayer,
      refreshBranches,
      mergeIntoMain,
    },
  ];
}

/**
 * Build the callback that loads the diff preview for the two most recent commits.
 * @param setState temporal panel state setter
 * @returns callback that loads (or clears) the diff for a commit list
 */
function useLoadDiff(setState: SetTemporalPanelState): LoadCommits {
  return useCallback(
    async (commits: TemporalCommitSummary[]) => {
      if (commits.length < 2) {
        setState((previous) => ({ ...previous, diff: undefined }));
        return;
      }
      const [fromCommit, toCommit] = commits.slice(-2) as [
        TemporalCommitSummary,
        TemporalCommitSummary,
      ];
      try {
        const diff = await getTemporalDiff({ from: fromCommit.id, to: toCommit.id });
        setState((previous) => ({ ...previous, diff }));
      } catch {
        setState((previous) => ({ ...previous, diff: undefined }));
      }
    },
    [setState],
  );
}

/**
 * Build the callback that loads a timeline: its commits, latest snapshot, and diff.
 * @param setState temporal panel state setter
 * @param readLayer accessor for the active layer
 * @param loadDiff callback that refreshes the diff preview
 * @returns callback that loads the requested timeline
 */
function useLoadBranch(
  setState: SetTemporalPanelState,
  readLayer: ReadLayer,
  loadDiff: LoadCommits,
): LoadBranch {
  return useCallback(
    async (branch: string) => {
      const layer = readLayer();
      setState((previous) => ({
        ...previous,
        branch,
        commits: [],
        commitId: undefined,
        snapshot: undefined,
        loading: true,
        error: undefined,
        snapshotLoading: false,
        mergeConflicts: undefined,
        layer,
      }));
      try {
        const commits = await listTemporalCommits(branch);
        const latest = commits.at(-1);
        let snapshot: StateAtSnapshot | undefined;
        if (latest) {
          snapshot = await getStateAtSnapshot({ asOf: latest.id, scenario: branch, layer });
        }
        setState((previous) => ({
          ...previous,
          branch,
          commits,
          commitId: latest?.id,
          snapshot,
          snapshotLoading: false,
          loading: false,
          merging: false,
          layer,
        }));
        await loadDiff(commits);
      } catch (unknownError) {
        setState((previous) => ({
          ...previous,
          loading: false,
          error: toErrorMessage(unknownError),
          snapshotLoading: false,
          merging: false,
        }));
      }
    },
    [setState, readLayer, loadDiff],
  );
}

/**
 * Build the callback that lists timelines and loads the preferred initial timeline.
 * @param setState temporal panel state setter
 * @param loadBranch callback that loads a single timeline
 * @returns callback that refreshes the timeline list
 */
function useLoadBranches(setState: SetTemporalPanelState, loadBranch: LoadBranch): LoadBranches {
  return useCallback(async () => {
    setState((previous) => ({ ...previous, loading: true, error: undefined }));
    try {
      const branches = await listTemporalBranches();
      const branch = pickInitialBranch(branches);
      setState((previous) => ({
        ...previous,
        branches,
        branch,
        mergeConflicts: undefined,
      }));
      if (branch) {
        await loadBranch(branch);
      } else {
        setState((previous) => ({ ...previous, loading: false, merging: false }));
      }
    } catch (unknownError) {
      setState((previous) => ({
        ...previous,
        loading: false,
        error: toErrorMessage(unknownError),
        mergeConflicts: undefined,
        merging: false,
      }));
    }
  }, [setState, loadBranch]);
}

/**
 * Build the callback that selects a commit and loads its snapshot.
 * @param setState temporal panel state setter
 * @param readLayer accessor for the active layer
 * @param branch currently selected timeline
 * @param currentCommitId currently selected commit
 * @returns callback that selects (or clears) the active commit
 */
function useSelectCommit(
  setState: SetTemporalPanelState,
  readLayer: ReadLayer,
  branch: string | undefined,
  currentCommitId: string | undefined,
): (commitId?: string) => void {
  return useCallback(
    (commitId?: string) => {
      const layer = readLayer();
      if (!branch) {
        return;
      }
      if (commitId !== undefined && commitId === currentCommitId) {
        return;
      }
      if (!commitId) {
        setState((previous) => ({
          ...previous,
          commitId: undefined,
          snapshot: undefined,
          snapshotLoading: false,
          mergeConflicts: undefined,
        }));
        return;
      }
      setState((previous) => ({
        ...previous,
        commitId,
        snapshotLoading: true,
        error: undefined,
        mergeConflicts: undefined,
        layer,
      }));
      applySnapshot(
        setState,
        { commitId, branch, layer },
        (previous, snapshot) => ({
          ...previous,
          commitId,
          snapshot,
          snapshotLoading: false,
          loading: false,
          layer,
        }),
        (previous, message) => ({
          ...previous,
          snapshotLoading: false,
          error: message,
          mergeConflicts: undefined,
        }),
      ).catch((_ignoredError: unknown) => {
        return;
      });
    },
    [setState, readLayer, branch, currentCommitId],
  );
}

/**
 * Build the callback that switches the active layer and reloads the snapshot.
 * @param setState temporal panel state setter
 * @param writeLayer setter for the active layer
 * @param branch currently selected timeline
 * @param commitId currently selected commit
 * @returns callback that changes the active layer
 */
function useSelectLayer(
  setState: SetTemporalPanelState,
  writeLayer: WriteLayer,
  branch: string | undefined,
  commitId: string | undefined,
): (layer: Layer) => void {
  return useCallback(
    (layer: Layer) => {
      writeLayer(layer);
      setState((previous) => ({
        ...previous,
        layer,
        snapshotLoading: !!previous.commitId,
        error: undefined,
      }));
      if (!branch || !commitId) {
        return;
      }
      void applySnapshot(
        setState,
        { commitId, branch, layer },
        (previous, snapshot) => ({
          ...previous,
          snapshot,
          snapshotLoading: false,
          layer,
        }),
        (previous, message) => ({ ...previous, snapshotLoading: false, error: message }),
      );
    },
    [setState, writeLayer, branch, commitId],
  );
}

/**
 * Build the callback that merges the active timeline into main.
 * @param setState temporal panel state setter
 * @param loadBranches callback that refreshes the timeline list
 * @param branch currently selected timeline
 * @param t translations for the temporal panel
 * @returns callback that applies the active timeline to main
 */
function useMergeIntoMain(
  setState: SetTemporalPanelState,
  loadBranches: LoadBranches,
  branch: string | undefined,
  t: ReturnType<typeof useTranslations>,
): () => Promise<void> {
  return useCallback(async () => {
    const sourceBranch = branch;
    if (!sourceBranch || sourceBranch === 'main') {
      return;
    }
    setState((previous) => ({
      ...previous,
      merging: true,
      error: undefined,
      mergeConflicts: undefined,
    }));
    try {
      const result = await mergeTemporalBranches({ source: sourceBranch, target: 'main' });
      if (result.conflicts && result.conflicts.length > 0) {
        setState((previous) => ({
          ...previous,
          merging: false,
          mergeConflicts: result.conflicts,
          error: t('mergeRequiresResolution'),
        }));
        return;
      }
      await loadBranches();
      setState((previous) => ({
        ...previous,
        merging: false,
        mergeConflicts: undefined,
      }));
    } catch (unknownError) {
      setState((previous) => ({
        ...previous,
        merging: false,
        mergeConflicts: undefined,
        error: toErrorMessage(unknownError),
      }));
    }
  }, [setState, loadBranches, branch, t]);
}

interface SnapshotRequest {
  readonly commitId: string;
  readonly branch: string;
  readonly layer: Layer;
}

type ApplySnapshotSuccess = (
  previous: TemporalPanelState,
  snapshot: StateAtSnapshot,
) => TemporalPanelState;
type ApplySnapshotFailure = (previous: TemporalPanelState, message: string) => TemporalPanelState;

/**
 * Fetch the snapshot for a request and hand the result (or error message) to the
 * caller-supplied state updaters, keeping the fetch and error handling in one place.
 * @param setState temporal panel state setter
 * @param request commit, branch, and layer to load
 * @param onSuccess updater applied with the loaded snapshot
 * @param onFailure updater applied with the error message
 */
async function applySnapshot(
  setState: SetTemporalPanelState,
  request: SnapshotRequest,
  onSuccess: ApplySnapshotSuccess,
  onFailure: ApplySnapshotFailure,
): Promise<void> {
  const { commitId, branch, layer } = request;
  try {
    const snapshot = await getStateAtSnapshot({ asOf: commitId, scenario: branch, layer });
    setState((previous) => onSuccess(previous, snapshot));
  } catch (unknownError) {
    const message = toErrorMessage(unknownError);
    setState((previous) => onFailure(previous, message));
  }
}

/**
 * Picks the preferred initial timeline (main if available, otherwise first entry).
 * @param {TemporalBranchSummary[]} branches available timeline summaries
 * @returns {string | undefined} chosen timeline name
 */
export function pickInitialBranch(branches: TemporalBranchSummary[]): string | undefined {
  if (branches.length === 0) {
    return undefined;
  }
  const main = branches.find((branch) => branch.name === 'main');
  return main?.name ?? branches[0]?.name;
}
