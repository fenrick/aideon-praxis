/**
 * GraphAdapter defines the read-only time-sliced graph access used by the UI.
 * Implementations must be backend-agnostic and respect AGENTS.md boundaries.
 */
export interface GraphAdapter {
  /** Fetches the graph state as-of a timestamp and optional scenario. */
  stateAt(params: { asOf: string; scenario?: string; confidence?: number }): Promise<unknown>;
  /** Computes a diff between two plateaus or dates. */
  diff(params: { from: string; to: string; scope?: unknown }): Promise<unknown>;
}

/** StorageAdapter abstracts snapshot persistence without leaking backend specifics. */
export interface StorageAdapter {
  getSnapshot(ref: string): Promise<ArrayBuffer>;
  putSnapshot(ref: string, bytes: ArrayBuffer): Promise<void>;
}

/** WorkerClient runs analytics jobs in the Python sidecar via RPC. */
export interface WorkerClient {
  runJob<TArgs extends object, TResult>(type: string, args: TArgs): Promise<TResult>;
}

export type {}; // placeholder for concrete job types
