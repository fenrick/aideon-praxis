# Architecture Boundary — Tauri Host ↔ Rust Engine

## Summary

The Tauri (Rust) host owns UI orchestration, OS integration, local persistence, and **secure IPC**.
The Rust engine crates provide graph analytics/ML and heavy computations (time-slicing, topology, TCO)
behind typed traits. Desktop mode uses in-process adapters; remote/server adapters must keep the same
contracts.

## RPC Boundary

- **Transport:** In-process (desktop mode). Remote/server adapters will reuse the same schema over
  pipes/UDS or HTTP/2 when enabled.
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

- Host initializes engine adapters during startup and keeps them in-process for desktop mode.
- Remote adapters (future) must expose health endpoints and stay supervisor-friendly.
- No open TCP ports in desktop mode; all work is local via typed traits.

## Cloud/Server Transition

- Swap the local engine adapters for remote clients (mTLS) via config while keeping DTOs stable.
- Desktop becomes a thin client; scheduling and connectors run server-side.

## Security Notes

- Evaluate `Temporal.StateAt` and `Temporal.Diff` in a sandbox context; log invocations
  (who/when/what) for audit.
- Enforce PII redaction at host boundary for all exports/results (deny-by-default with allowlists).
- Apply strict least-privilege FS and process permissions for UDS/pipe locations.
