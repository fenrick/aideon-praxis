/**
 * Arguments for requesting a time‑sliced graph (Temporal.StateAt).
 *
 * - `asOf` is an ISO date string (YYYY‑MM‑DD).
 * - `scenario` is an optional branch identifier.
 * - `confidence` optionally weights scenario application when blending.
 */
export type CommitReference = string | { branch: string; at?: string };

export interface StateAtArguments {
  /** Commit reference or branch handle to materialise. */
  asOf: CommitReference;
  /** Optional scenario/branch reference. */
  scenario?: string;
  /** Optional confidence in [0,1] when blending scenario effects. */
  confidence?: number;
}

/**
 * Result payload returned by the worker for `Temporal.StateAt`.
 *
 * The shape is intentionally small and stable while the full model evolves.
 */
export interface StateAtResult {
  /** Echo of the requested `asOf` time‑slice. */
  asOf: string;
  /** Echo of the applied scenario (or null). */
  scenario: string | null;
  /** Echo of the applied confidence (or null). */
  confidence: number | null;
  /** Count of nodes present in the time‑slice. */
  nodes: number;
  /** Count of edges present in the time‑slice. */
  edges: number;
}

/** Health snapshot returned by the worker. */
export interface WorkerHealth {
  /** Indicates whether the worker is serving requests normally. */
  ok: boolean;
  /** Optional human-readable message when degraded. */
  message: string | null;
  /** Millisecond timestamp (Unix epoch) when the snapshot was captured. */
  timestampMs: number;
}

export interface NodeVersion {
  id: string;
  type?: string;
  props?: Record<string, unknown>;
}

export interface NodeTombstone {
  id: string;
}

export interface EdgeVersion {
  id?: string;
  from: string;
  to: string;
  type?: string;
  directed?: boolean;
  props?: Record<string, unknown>;
}

export interface EdgeTombstone {
  from: string;
  to: string;
}

export interface TemporalChangeSet {
  nodeCreates?: readonly NodeVersion[];
  nodeUpdates?: readonly NodeVersion[];
  nodeDeletes?: readonly NodeTombstone[];
  edgeCreates?: readonly EdgeVersion[];
  edgeUpdates?: readonly EdgeVersion[];
  edgeDeletes?: readonly EdgeTombstone[];
}

export interface TemporalCommitSummary {
  id: string;
  parents: readonly string[];
  branch: string;
  author?: string;
  time?: string;
  message: string;
  tags: readonly string[];
  changeCount: number;
}

/** Payload for committing staged graph changes to the host. */
export interface TemporalCommitRequest {
  branch: string;
  parent?: string;
  author?: string;
  time?: string;
  message: string;
  tags?: readonly string[];
  changes: TemporalChangeSet;
}

/** Response returned by the host when a commit is created. */
export interface TemporalCommitResponse {
  id: string;
}

/** Arguments for creating a new branch within the temporal store. */
export interface TemporalCreateBranchRequest {
  name: string;
  from?: CommitReference;
}

/** Host response when a branch is created. */
export interface TemporalCreateBranchResponse {
  name: string;
  head: string | null;
}

export interface TemporalDiffRequest {
  from: CommitReference;
  to: CommitReference;
  scope?: Record<string, unknown>;
}

export interface TemporalDiffSnapshot {
  from: string;
  to: string;
  metrics: TemporalDiffMetrics;
}

export interface TemporalDiffMetrics {
  nodeAdds: number;
  nodeMods: number;
  nodeDels: number;
  edgeAdds: number;
  edgeMods: number;
  edgeDels: number;
}

/**
 * Shared host contract types used by the renderer when invoking Tauri commands.
 */
