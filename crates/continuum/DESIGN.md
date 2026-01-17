# Continuum Orchestrator – Design

## Purpose & scope

Continuum Orchestrator is the **automation plane** for Aideon Suite. It coordinates:

- schedules (recurring runs, maintenance windows),
- connectors (external systems, imports),
- replayable ingest workflows (provenance-preserving ops + facts),
- bounded, job-driven execution for long-running automation.

Continuum does not own UI and does not bypass the host boundary. It provides orchestration and
adapter interfaces that the host can run as jobs.

## Allowed dependencies / frameworks

- Rust 2024 with workspace defaults.
- `tokio` for async scheduling, `serde`/`serde_json` for configs and job payloads, `thiserror` for
  error types, `tracing` + `log` facade for observability.
- Orchestration interfaces depend on `praxis` and `mneme`; connector
  integrations live behind traits/adapters.

## Anti-goals

- No renderer/UI or Tauri bindings.
- No direct DB coupling beyond Mneme traits; avoid embedding SQL here.
- No bespoke schedulers or thread pools when Tokio timers suffice.

## Architecture

### Position in the stack

- Renderer: configures schedules/connectors via host surfaces (when enabled).
- Host: owns capability gating, secrets, OS integration, and job lifecycle/events.
- Continuum: defines orchestration flows and connector interfaces; runs inside host-managed jobs.
- Praxis/Mneme: receive ingest outputs as ops/facts; remain the source of truth.

### Core invariants

- **Replayable ingest**: a run can be replayed to produce identical ops/facts (given identical inputs).
- **Explicit provenance**: every ingested record has a source, run id, and time context.
- **Bounded execution**: fanout, payload size, duration, and concurrency are explicitly bounded.
- **Idempotency**: runs should not duplicate facts when re-run; dedupe keys are first-class.
- **Capability control**: automation is deny-by-default and must be explicitly enabled.

## Public surface (current + target)

- Traits for scheduling and orchestration of connector jobs and snapshot/layout persistence.
- Adapter interfaces for external systems (CMDB, file imports) with clear contract types.
- Helper functions to compose engine + persistence flows for the host/worker.

### SnapshotStore (current)

Continuum currently exposes a minimal `SnapshotStore` trait and a `FileSnapshotStore` implementation
for desktop mode. This is intended as a persistence boundary for “opaque bytes with a key” where the
host controls the root directory.

Rules:

- keys are opaque references (implementation-defined), not absolute paths
- callers must treat stored bytes as untrusted until validated by a higher layer
- store implementations are swappable (file, SQLite, object store) without changing callers

### Connector interface (target)

Continuum should standardize connectors behind a narrow interface that supports bounded runs:

- `plan_run(config)` → returns a bounded plan (counts, estimated work, required capabilities)
- `execute_run(plan)` → emits records/ops in a streaming fashion with progress callbacks
- `checkpoint()` / `resume()` (optional) → supports long runs with durable checkpoints

Connector outputs must include:

- stable external ids
- provenance (source system, connector version, run id)
- time context mapping (valid time + asserted time policy)
- suggested dedupe keys for idempotent ingestion

### Scheduling model (target)

Continuum scheduling must be explicit and safe:

- schedules are configured as data (cron/interval + jitter + maintenance windows)
- schedules can be paused/resumed without losing state
- backfills are bounded and auditable
- retries use exponential backoff with a max retry budget

Execution model:

- schedule ticks enqueue host-managed jobs (not inlined execution)
- jobs emit `job_*` progress via the host event bus
- cancellations are cooperative and observable

## Security posture

Continuum must not weaken the desktop baseline:

- no renderer-side networking
- no new open ports in desktop mode
- secrets are host-owned (platform-secure storage); Continuum receives only scoped tokens/handles
- all connector execution is capability-gated and logged/audited

## Testing strategy

Continuum must be testable without external services:

- unit tests for scheduler logic (next fire time, jitter, pause/resume)
- unit tests for idempotency/dedupe behavior
- connector contract tests using in-memory fakes
- replayability tests: same input fixtures produce identical ops/facts

## Evergreen notes

- Replace any legacy shell-scripted scheduling with Tokio-driven adapters.
- Converge ad-hoc connector code onto the shared adapter interfaces before adding new backends.
