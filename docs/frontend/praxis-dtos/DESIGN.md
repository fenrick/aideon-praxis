# Praxis DTOs — Internal Design

The DTO shapes, the camelCase boundary, branded types, zod validation, and versioning. This file is for anyone shaping a boundary type. The package contract is in [README.md](./README.md).

---

## Scope

Praxis DTOs holds the shared shapes for temporal state/diff snapshots, metamodel documents, plan events, and worker job payloads, keeping the IPC and worker contracts consistent across renderer, host, and engines. DTOs are type-first; helpers use the standard library only (e.g. date parsing in `ensureIsoDateTime`). Types are exported from `temporal.ts`, `meta.ts`, `plan-event.ts`, and `iso.ts`, re-exported via `src/index.ts` for stable consumer imports.

## The camelCase boundary

DTOs are camelCase across the boundary; the Rust host owns the wire shape with `serde`, and the TS DTOs mirror the Rust equivalents from Mneme/Praxis ([ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)). The generated types keep the renderer aligned; the renderer reads newer MINOR payloads by ignoring unknown fields rather than failing ([ADR-0017](../../06-adrs/ADR-0017-contract-and-dto-versioning.md)).

## Branded types

Identifiers are branded so a `ScenarioId` cannot be passed where an `EntityId` is expected; the mix-up fails at compile time, not runtime ([ipc-adapters-and-dtos.md](../ipc-adapters-and-dtos.md)). The `Viewpoint` is a single typed value carrying its five coordinates — as-of valid time, as-of asserted time, layer or layer policy, scenario, scope — used as the cache key and passed to every viewpoint-scoped read ([state-architecture.md](../state-architecture.md)). Enum-typed fields (content classification, layer) are handled exhaustively at the consumer with a `never`-typed default, so a new host variant the renderer does not handle is a type error.

## Zod validation

Inbound payloads are validated with zod schemas at the adapter boundary before they become DTOs ([praxis-adapters](../praxis-adapters/DESIGN.md)): an unexpected shape is an error, not a silently-mishandled value. The zod schema mirrors the JSON Schema shape the host validates against ([CONTRACTS-AND-SCHEMAS.md](../../04-contracts/CONTRACTS-AND-SCHEMAS.md), JSON Schema 2020-12). Validation is the renderer's guard: additive MINOR fields pass through ignored, a violated invariant is surfaced.

## Versioning

DTOs are versioned with Semantic Versioning 2.0.0 ([ADR-0017](../../06-adrs/ADR-0017-contract-and-dto-versioning.md)): a new optional field or an enum variant behind explicit handling is a MINOR; renaming a field, changing a type or meaning, or removing a variant is a MAJOR and is negotiated at the IPC handshake. Keep DTOs aligned with the Rust equivalents and prefer additive evolution; migrate any legacy loose `any`/`unknown` DTOs to explicit types.

## Testing

DTOs are typechecked as part of the suite and their zod schemas exercised against fixtures; the DTO shapes are asserted against the Rust-generated types so a drift is caught ([testing.md](../testing.md)). Branded-type and exhaustiveness checks are compile-time tests — a wrong-brand id or an unhandled variant fails `tsc`.

## Related documents

| Document                                                                | What it covers                                             |
| ----------------------------------------------------------------------- | ---------------------------------------------------------- |
| [README.md](./README.md)                                                | The package contract.                                      |
| [ipc-adapters-and-dtos.md](../ipc-adapters-and-dtos.md)                 | The seam-level contract, branded types, and error mapping. |
| [CONTRACTS-AND-SCHEMAS.md](../../04-contracts/CONTRACTS-AND-SCHEMAS.md) | The IPC manifest and JSON Schema discipline.               |
| [ADR-0017](../../06-adrs/ADR-0017-contract-and-dto-versioning.md)       | The SemVer versioning policy.                              |
