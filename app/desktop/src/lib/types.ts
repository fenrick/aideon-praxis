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

/**
 * Typed surface exposed on `window.aideon` for renderer ↔ host IPC.
 *
 * This matches the Tauri shim and any preload bridges so that UI code remains
 * agnostic of the runtime (desktop vs. future server mode).
 */
export interface AideonApi {
  /** Current bridge version identifier. */
  version: string;
  /** Invoke the temporal `state_at` command. */
  stateAt(arguments_: StateAtArguments): Promise<StateAtResult>;
  /** Open the settings window. */
  openSettings(): Promise<void>;
  /** Open the about window. */
  openAbout(): Promise<void>;
  /** Open the status window. */
  openStatus(): Promise<void>;
  /** Retrieve the current worker health snapshot. */
  workerHealth(): Promise<WorkerHealth>;
}
