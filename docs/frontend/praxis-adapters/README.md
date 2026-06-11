# Praxis Adapters

The typed IPC adapter interfaces that form the renderer's UI boundary to the host. This is a contract leaf — type-only, backend-agnostic, with no React, Tauri, DOM, or network dependency ([package-layout.md](../package-layout.md)). It lives at `src/adapters` within the desktop package; import via relative or `src`-rooted paths, no aliases.

This README is the contract; [DESIGN.md](./DESIGN.md) carries the interface and error-mapping detail.

## What it provides

- `GraphAdapter` / `MutableGraphAdapter` — time-sliced graph read and the mutating extension.
- `MetaModelProvider` — metamodel information so UIs build forms dynamically from the effective schema.
- `StorageAdapter` — snapshot and layout persistence through host commands.
- `WorkerClient` and the worker job contracts for analytics and temporal jobs.
- Utilities such as `ensureIsoDateTime` to normalise timestamp inputs.
- Test fakes (e.g. `DevelopmentMemoryGraph`) so consumers exercise UI flows without a real backend.

## Faces

Every module the renderer reaches, through the host's command surface ([host/README.md](../../05-modules/host/README.md)). Adapters call host commands via `invoke`; implementations carry no backend specifics into the renderer boundary ([ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)).

## Boundaries

- Type-first; no UI, CSS, renderer state, host/engine logic, or IPC wiring of its own.
- Depends only on TypeScript and the shared DTOs (`src/dtos`).
- Expand an adapter interface rather than add an ad-hoc `invoke` in a component ([ipc-adapters-and-dtos.md](../ipc-adapters-and-dtos.md)).

## Running and testing

- Typecheck: `pnpm run node:typecheck`.
- Tests: `pnpm run node:test` — provide stub/fake adapters to exercise UI flows without a real backend ([testing.md](../testing.md)).

## Related documents

| Document                                                | What it covers                                    |
| ------------------------------------------------------- | ------------------------------------------------- |
| [DESIGN.md](./DESIGN.md)                                | The interfaces, optimistic UI, and error mapping. |
| [ipc-adapters-and-dtos.md](../ipc-adapters-and-dtos.md) | The seam-level contract this package realises.    |
| [praxis-dtos](../praxis-dtos/README.md)                 | The DTO shapes these adapters carry.              |
| [host/README.md](../../05-modules/host/README.md)       | The host command surface adapters call.           |
