# Architecture Boundary — Electron Host ↔ Python Worker

## Summary

The Electron/Node host owns UI, OS integration, local persistence, and **secure IPC**. The Python
worker is a long-lived sidecar providing graph analytics/ML and heavy computations (time-slicing,
topology, TCO).

## RPC Boundary

- **Transport:** Named pipe (Windows), Unix domain socket (macOS/Linux), or stdio.
- **Auth:** Random per-launch capability token; deadlines; backpressure; per-job timeouts.
- **Schema:** Protobuf (recommended) or versioned JSON schema.

### Core Messages

- **Job**: `id`, `type`, `schemaVersion`, `payloadRef` (JSON or Arrow), `options`, `deadline`.
- **Result**: `id`, `status`, `payloadRef` (JSON or Arrow), `metrics` (duration, bytes), `error?`.
- **Health**: `status`, `versions`, `uptime`.

## Job Types (v1)

- `Analytics.ShortestPath` — `{ from, to, maxHops }`.
- `Analytics.Centrality` — `{ algorithm: "degree"|"betweenness", scope }`.
- `Analytics.Impact` — `{ seedRefs[], filters{} }`.
- `Temporal.StateAt` — `{ asOf, scenario?, confidence? }` → materialised subgraph.
- `Temporal.Diff` — `{ from: plateauId|date, to: plateauId|date, scope? }`.
- `Temporal.TopologyDelta` — `{ from, to }`.
- `Finance.TCO` — `{ scope, asOf, scenario?, policies? }`.

## Data Transfer

- **Small**: JSON (UTF-8).
- **Large/columnar**: Apache Arrow; optional Arrow Flight over gRPC (server mode).
- Payloads are immutable; results include provenance (snapshotId, policySetIds).

## Process Lifecycle

- Host supervises worker: start, healthcheck, restart-on-crash, graceful shutdown.
- One worker per app session; caches warmed on demand; no open TCP ports in desktop mode.

## Cloud/Server Transition

- Worker and graph move to remote endpoints (mTLS) via config, reusing the same schemas.
- Desktop becomes a thin client; scheduling and connectors run server-side.

## Security Notes

- Evaluate `Temporal.StateAt` and `Temporal.Diff` in a sandbox context; log invocations
  (who/when/what) for audit.
- Enforce PII redaction at host boundary for all exports/results (deny-by-default with allowlists).
- Apply strict least-privilege FS and process permissions for UDS/pipe locations.
