# @aideon/praxis-adapters — Type Contracts

TypeScript interfaces defining the UI boundary for Graph access, Storage
snapshots, and the Worker client. Implementations are backend‑agnostic and must
not introduce backend specifics into the renderer boundary.

Interfaces

- `GraphAdapter` — read-only time-sliced access returning `TemporalStateSnapshot`/`TemporalDiffSnapshot`.
- `MutableGraphAdapter` — extends `GraphAdapter` with branch/commit helpers for dev workflows.
- `MetaModelProvider` — surfaces the active schema (`MetaModelDocument`) so UIs can build forms dynamically.
- `StorageAdapter` — snapshot persistence (get/put by opaque reference).
- `WorkerClient` — strongly-typed job runner backed by `WorkerJobMap`.

Supporting types

- `TemporalStateParameters`, `TemporalStateSnapshot`, `TemporalDiffParameters`, `TemporalDiffSnapshot`.
- `MetaModelDocument`, `MetaModelType`, and related attribute/relationship helpers.
- `PlanEvent`, matching the minimal schema documented in `AGENTS.md`.
- `WorkerJobMap`, `WorkerJobRequest`, `WorkerJobResult` covering analytics and temporal jobs.
- Utility `ensureIsoDateTime(value)` to normalise timestamp inputs.

Usage

- UI code depends solely on these interfaces; concrete adapters live in dedicated
  renderer or host modules and are injected at the IPC boundary.
- Import from `@aideon/praxis-adapters` to obtain the adapters and shared
  contracts, e.g.:

  ```ts
  import type { GraphAdapter, TemporalStateSnapshot } from '@aideon/praxis-adapters';
  ```

- General DTOs like temporal snapshots are defined in `@aideon/praxis-dtos`.

Testing

- Provide stub/fake implementations in tests to validate UI flows without
  hitting a real backend. `DevelopmentMemoryGraph` offers a ready-made in-memory
  implementation for demo scenarios.
