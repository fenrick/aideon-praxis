# @aideon/adapters — Type Contracts

TypeScript interfaces defining the UI boundary for Graph access, Storage
snapshots, and the Worker client. Implementations are backend‑agnostic and must
not introduce backend specifics into the renderer.

Interfaces

- `GraphAdapter` — read‑only time‑sliced graph access returning `TemporalStateSnapshot` and `TemporalDiffSnapshot`.
- `MutableGraphAdapter` — extends `GraphAdapter` with branch/commit helpers for dev tooling.
- `StorageAdapter` — snapshot persistence (get/put by opaque reference).
- `WorkerClient` — strongly‑typed job runner backed by `WorkerJobMap`.

Supporting types

- `TemporalStateParameters`, `TemporalStateSnapshot`, `TemporalDiffParameters`, `TemporalDiffSnapshot`.
- `PlanEvent`, matching the minimal schema in `AGENTS.md`.
- `WorkerJobMap`, `WorkerJobRequest`, `WorkerJobResult` covering analytics and temporal jobs.
- Utility `ensureIsoDateTime(value)` to normalise timestamp inputs.

Usage

- UI code depends only on these interfaces. Concrete adapters live in separate
  app modules and are injected at the renderer boundary.
- Import from `@aideon/adapters` to obtain both adapters and shared contracts, e.g.:

  ```ts
  import type { GraphAdapter, TemporalStateSnapshot } from '@aideon/adapters';
  ```

Testing

- Provide stub/fake implementations in tests to validate UI flows without
  hitting a real backend. `DevelopmentMemoryGraph` offers a ready-made in-memory
  implementation for demo scenarios.
