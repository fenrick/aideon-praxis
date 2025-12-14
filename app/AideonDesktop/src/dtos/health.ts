// Shared worker health DTO surfaced over renderer ↔ host IPC.

export interface WorkerHealth {
  ok: boolean;
  timestamp_ms: number;
  /** Optional error or degradation note supplied by the host/worker. */
  message?: string;
  /** Renderer-added metadata to surface transport latency. */
  latency_ms?: number;
  /** Renderer-friendly status label (e.g., "operational", "degraded"). */
  status?: string;
  /** Human readable notes shown in the dashboard. */
  notes?: string;
}
