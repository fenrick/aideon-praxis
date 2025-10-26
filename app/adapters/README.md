# @aideon/adapters — Type Contracts

TypeScript interfaces defining the UI boundary for Graph access, Storage
snapshots, and the Worker client. Implementations are backend‑agnostic and must
not introduce backend specifics into the renderer.

Interfaces

- `GraphAdapter` — read‑only time‑sliced graph access: `stateAt`, `diff`.
- `StorageAdapter` — snapshot persistence (get/put by reference).
- `WorkerClient` — generic job runner for the Rust engine adapters (local or remote).

Usage

- UI code depends only on these interfaces. Concrete adapters live in separate
  app modules and are injected at the renderer boundary.

Testing

- Provide stub/fake implementations in tests to validate UI flows without
  hitting a real backend.
