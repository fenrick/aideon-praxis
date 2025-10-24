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
