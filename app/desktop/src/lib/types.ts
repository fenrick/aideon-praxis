/**
 * Arguments for requesting a time‑sliced graph (Temporal.StateAt).
 *
 * - `asOf` is an ISO date string (YYYY‑MM‑DD).
 * - `scenario` is an optional branch identifier.
 * - `confidence` optionally weights scenario application when blending.
 */
export interface StateAtArguments {
  /** ISO date string for the time‑slice (e.g., "2025-01-01"). */
  asOf: string;
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

export interface TemporalCommitSummary {
  id: string;
  branch: string;
  asOf: string;
  parentId?: string;
  message?: string;
}

/** Payload for committing staged graph changes to the host. */
export interface TemporalCommitRequest {
  branch: string;
  asOf: string;
  message?: string;
  addNodes?: readonly string[];
  removeNodes?: readonly string[];
  addEdges?: readonly { source: string; target: string }[];
  removeEdges?: readonly { source: string; target: string }[];
}

/** Response returned by the host when a commit is created. */
export interface TemporalCommitResponse {
  id: string;
}

/** Arguments for creating a new branch within the temporal store. */
export interface TemporalCreateBranchRequest {
  name: string;
  from?: string;
}

/** Host response when a branch is created. */
export interface TemporalCreateBranchResponse {
  name: string;
  head: string | null;
}

export interface TemporalDiffRequest {
  from: string;
  to: string;
  scope?: Record<string, unknown>;
}

export interface TemporalDiffSnapshot {
  from: string;
  to: string;
  metrics: TemporalDiffMetrics;
}

export interface TemporalDiffMetrics {
  nodesAdded: number;
  nodesRemoved: number;
  edgesAdded: number;
  edgesRemoved: number;
}

/**
 * Shared host contract types used by the renderer when invoking Tauri commands.
 */
