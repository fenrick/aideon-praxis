export { ensureIsoDateTime } from './contracts';

export type {
  ConfidencePercent,
  GraphSnapshotMetrics,
  IsoDateTime,
  PlanEvent,
  PlanEventEffect,
  PlanEventSource,
  ScenarioKey,
  TemporalDiffMetrics,
  TemporalDiffParameters,
  TemporalDiffSnapshot,
  TemporalStateParameters,
  TemporalStateSnapshot,
  WorkerJobMap,
  WorkerJobRequest,
  WorkerJobResult,
} from './contracts';

import type {
  TemporalDiffParameters,
  TemporalDiffSnapshot,
  TemporalStateParameters,
  TemporalStateSnapshot,
  WorkerJobRequest,
  WorkerJobResult,
} from './contracts';

export { IpcTemporalAdapter } from './timegraph-ipc';

/**
 * GraphAdapter defines the read-only time-sliced graph access used by the UI.
 * Implementations must be backend-agnostic and respect AGENTS.md boundaries.
 */
export interface GraphAdapter {
  /**
   * Fetches the immutable graph snapshot for the provided timestamp.
   * Implementations must honour the "time-first" semantics by avoiding
   * in-place mutation of the returned object.
   */
  stateAt(parameters: TemporalStateParameters): Promise<TemporalStateSnapshot>;

  /**
   * Computes change statistics between two snapshots. Backends may choose the
   * most efficient path (e.g., diffing plateau IDs or re-running analytics).
   */
  diff(parameters: TemporalDiffParameters): Promise<TemporalDiffSnapshot>;
}

/**
 * StorageAdapter abstracts snapshot persistence without leaking backend specifics.
 * References are opaque handles chosen by the host (e.g., plateau IDs or URIs).
 */
export interface StorageAdapter {
  getSnapshot(reference: string): Promise<ArrayBuffer>;
  putSnapshot(reference: string, bytesData: ArrayBuffer): Promise<void>;
}

/**
 * WorkerClient runs analytics jobs via the Rust engine adapters (local or remote).
 * The discriminated union ensures only supported jobs can be invoked.
 */
export interface WorkerClient {
  runJob<TJob extends WorkerJobRequest>(job: TJob): Promise<WorkerJobResult<TJob>>;
}

/** Mutable graph adapter extends read-only with commit/branch operations for dev flows. */
export interface MutableGraphAdapter extends GraphAdapter {
  commit(parameters: {
    branch: string;
    asOf: string;
    message?: string;
    addNodes?: string[];
    removeNodes?: string[];
    addEdges?: { source: string; target: string }[];
    removeEdges?: { source: string; target: string }[];
  }): Promise<{ id: string }>;
  listCommits(parameters: {
    branch: string;
  }): Promise<{ id: string; branch: string; asOf: string; parentId?: string; message?: string }[]>;
  createBranch(parameters: { name: string; from?: string }): Promise<void>;
}
