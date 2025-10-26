/**
 * GraphAdapter defines the read-only time-sliced graph access used by the UI.
 * Implementations must be backend-agnostic and respect AGENTS.md boundaries.
 */
export interface GraphAdapter {
  /** Fetches the graph state as-of a timestamp and optional scenario. */
  stateAt(parameters: { asOf: string; scenario?: string; confidence?: number }): Promise<unknown>;
  /** Computes a diff between two plateaus or dates. */
  diff(parameters: { from: string; to: string; scope?: unknown }): Promise<unknown>;
}

/** StorageAdapter abstracts snapshot persistence without leaking backend specifics. */
export interface StorageAdapter {
  getSnapshot(reference: string): Promise<ArrayBuffer>;
  putSnapshot(reference: string, bytesData: ArrayBuffer): Promise<void>;
}

/** WorkerClient runs analytics jobs via the Rust engine adapters (local or remote). */
export interface WorkerClient {
  runJob<TResult>(jobType: string, jobArguments: unknown): Promise<TResult>;
}

// placeholder for concrete job types
