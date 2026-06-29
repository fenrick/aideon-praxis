# Praxis Adapters — Internal Design

The adapter interfaces, the optimistic-UI contract, and the host→UI error mapping. This file is for anyone defining or implementing an adapter. The package contract is in [README.md](./README.md).

---

## Scope

Praxis Adapters defines the TypeScript interfaces for the renderer/host boundary — graph, metamodel, storage, worker. It is type-only and backend-agnostic, with light utilities (type guards, `ensureIsoDateTime`) and no React, Tauri, DOM, or network dependency. Migrate any legacy Svelte-era or CommonJS shims to ESM/React-era contracts; prefer expanding an adapter interface over adding an ad-hoc IPC endpoint in a surface.

## The interfaces

| Interface             | Responsibility                                                                                                                                                                                                                               |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GraphAdapter`        | Read the effective graph at a viewpoint — time-sliced node/edge slices, bounded ([data-fetching.md](../data-fetching.md)).                                                                                                                   |
| `MutableGraphAdapter` | The mutating extension: apply operations as commands, with an idempotency key and optimistic UI.                                                                                                                                             |
| `MetaModelProvider`   | Surface the metamodel/effective schema so the inspector builds edit forms dynamically rather than hard-coding fields.                                                                                                                        |
| `StorageAdapter`      | Persist and load snapshot/layout geometry through host-managed commands. Layout is keyed by `surface_id + surface_instance/destination + layout_preset` — **not** the viewpoint ([praxis-contributions](../praxis-contributions/DESIGN.md)). |
| `WorkerClient`        | Dispatch analytics and temporal jobs and observe their lifecycle ([ACCEPTED-WORK-AND-EVENTS.md](../../04-contracts/ACCEPTED-WORK-AND-EVENTS.md)).                                                                                            |

Each method takes a `Viewpoint` where the read or write is viewpoint-scoped ([state-architecture.md](../state-architecture.md)); the viewpoint is a typed value, not an ambient global.

## Optimistic UI

`MutableGraphAdapter` supports an optimistic update for immediate feedback ([data-fetching.md](../data-fetching.md)):

1. The mutation carries an idempotency key so a retry is safe and does not double-apply ([ADR-0018](../../06-adrs/ADR-0018-idempotency-and-deduplication.md)).
2. The cache may be updated optimistically; the optimistic value is clearly provisional.
3. On the host's response and follow-on events, the affected keys are invalidated and the canonical state refetched ([data-fetching.md](../data-fetching.md)); the optimistic value is reconciled, not trusted.
4. A `BACKPRESSURE` reply is a queued state, not success ([ux/backpressure-ux.md](../../03-design/ux/backpressure-ux.md)); a `CONFLICT_RECORDED` reply enters the conflict flow ([ux/multi-user-conflict-ux.md](../../03-design/ux/multi-user-conflict-ux.md)).

Reconciliation of an optimistic update against `CONFLICT_RECORDED` is an open question ([ADR-0026](../../06-adrs/ADR-0026-frontend-state-architecture.md)); where it cannot be reconciled safely, the adapter waits for the host result before reflecting the change.

## Error mapping: host → UI

The adapter is the single place a host error becomes a UI outcome. The host returns the stable error envelope ([error-envelope.md](../../04-contracts/ipc/error-envelope.md), RFC 9457, [ADR-0016](../../06-adrs/ADR-0016-error-envelope-rfc9457.md)); the adapter maps the **code**, never the prose, to a message and a next action, preserving correlation ids ([error-loading-empty.md](../error-loading-empty.md)). A raw error object never reaches a component. The mapping table is in [error-loading-empty.md](../error-loading-empty.md); the adapter is where it is applied.

## Validation

Inbound payloads are validated with zod at the boundary before becoming DTOs ([praxis-dtos](../praxis-dtos/README.md)); an additive MINOR field is ignored, a violated invariant is surfaced as an error ([ADR-0017](../../06-adrs/ADR-0017-contract-and-dto-versioning.md)). A component always receives a validated, typed DTO.

## Testing

Consumers test against the test fakes (e.g. `DevelopmentMemoryGraph`) so UI flows run without a real backend; the real adapter is exercised against a Tauri-mock that returns DTO fixtures and emits the typed events a test needs ([testing.md](../testing.md)).

## Related documents

| Document                                                                      | What it covers                                          |
| ----------------------------------------------------------------------------- | ------------------------------------------------------- |
| [README.md](./README.md)                                                      | The package contract.                                   |
| [ipc-adapters-and-dtos.md](../ipc-adapters-and-dtos.md)                       | The seam-level contract, branded types, and versioning. |
| [error-loading-empty.md](../error-loading-empty.md)                           | The error-code → UI mapping table.                      |
| [ACCEPTED-WORK-AND-EVENTS.md](../../04-contracts/ACCEPTED-WORK-AND-EVENTS.md) | The accepted-work lifecycle the worker client observes. |
