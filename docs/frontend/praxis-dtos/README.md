# Praxis DTOs

The shared TypeScript data-transfer objects that cross the renderer/host boundary. This is a contract leaf — type-first, runtime-agnostic, with no React, Tauri, DOM, or network dependency ([package-layout.md](../package-layout.md)). It lives at `src/dtos` within the desktop package; import via relative or `src`-rooted paths, no aliases.

This README is the contract; [DESIGN.md](./DESIGN.md) carries the shape, branding, and versioning detail.

## What it provides

- DTOs for temporal state/diff snapshots, metamodel documents, plan events, and analytics/worker job payloads.
- Branded id types and a typed `Viewpoint`, so a wrong-brand id fails `tsc` ([ipc-adapters-and-dtos.md](../ipc-adapters-and-dtos.md)).
- ISO helpers (`ensureIsoDateTime`) and stable re-exports via `src/index.ts`.

## Faces

The Rust DTOs from Mneme and Praxis. The host owns the wire shape with `serde`; the TS DTOs mirror it in camelCase and the generated types keep the renderer aligned ([ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)).

## Boundaries

- camelCase across the boundary; type-first, with helpers using the standard library only.
- No business logic, persistence, IPC implementation, UI, or Node-specific APIs.
- Additive versioning preferred over breaking change ([ADR-0017](../../06-adrs/ADR-0017-contract-and-dto-versioning.md)).

## Running and testing

- Typecheck: `pnpm --filter @aideon/desktop run typecheck` (and suite-wide `pnpm run node:typecheck`).
- Tests: `pnpm run node:test` — the Vitest suite includes DTO and zod-validation tests ([testing.md](../testing.md)).

## Related documents

| Document                                                          | What it covers                                                 |
| ----------------------------------------------------------------- | -------------------------------------------------------------- |
| [DESIGN.md](./DESIGN.md)                                          | The DTO shapes, branded types, zod validation, and versioning. |
| [ipc-adapters-and-dtos.md](../ipc-adapters-and-dtos.md)           | The seam-level contract this package realises.                 |
| [ADR-0017](../../06-adrs/ADR-0017-contract-and-dto-versioning.md) | The SemVer versioning of DTOs.                                 |
