# IPC Adapters and DTOs

The typed seam between the renderer and the host: adapters that wrap IPC, DTOs that cross the boundary, branded types,
zod validation, and error mapping. This file is for anyone calling the host or shaping a boundary type. The
package-level contracts are in [praxis-adapters](./praxis-adapters/README.md) and
[praxis-dtos](./praxis-dtos/README.md).

---

## The principle

The renderer reaches the host only through typed IPC adapters
([ADR-0006](../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)). There is no renderer HTTP, no `fetch`/`axios`,
and no TCP listener; every privileged action flows through a Tauri command (`invoke`) and every host update arrives as a
typed event. The adapter layer is the single place IPC is wrapped, validated, and error-mapped, so a component never
sees a raw IPC call or a raw error.

## The adapter interfaces

Adapters are TypeScript interfaces forming the UI boundary; implementations are backend-agnostic and carry no backend
specifics into the renderer ([praxis-adapters](./praxis-adapters/README.md)). The core interfaces:

- `GraphAdapter` — time-sliced read access to the effective graph at a viewpoint.
- `MutableGraphAdapter` — the mutating extension: applies operations as commands, with optimistic UI and idempotency.
- `MetaModelProvider` — surfaces metamodel information so UIs build forms dynamically from the effective schema.
- `StorageAdapter` — snapshot/layout persistence through host-managed commands.
- `WorkerClient` and the worker job contracts — analytics and temporal job DTOs.

Adapter interfaces are expanded rather than supplemented with ad-hoc `invoke` calls in components: a new host need is a
new adapter method, not a one-off IPC call scattered in a surface ([praxis-adapters](./praxis-adapters/README.md)).

## The DTO boundary

DTOs are the shared shapes crossing the boundary ([praxis-dtos](./praxis-dtos/README.md)):

- **camelCase across the boundary.** The Rust host owns the wire shape with `serde`; the TS DTOs are camelCase and the
  generated types keep the renderer aligned ([ADR-0006](../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)).
- **Type-first, runtime-agnostic.** DTOs carry no business logic, no IPC implementation, no UI, and no Node-specific
  APIs, so they stay portable across the renderer and host-mock contexts.
- **Aligned to the Rust DTOs.** The TS DTOs mirror the Rust equivalents from Mneme/Praxis; additive evolution is
  preferred over breaking change.

## Branded types and exhaustiveness

Identifiers are branded so a scenario id cannot be passed where an entity id is expected, and the wrong-brand error is
caught at compile time, not runtime:

- IDs are branded types (e.g. a `ScenarioId` distinct from an `EntityId`), so a mix-up fails `tsc`.
- Enum handling is exhaustive — a `switch` over a content classification or a layer ends in a `never`-typed default, so
  adding a host enum variant that the renderer does not handle is a type error ([testing.md](./testing.md)).
- A `Viewpoint` is a single typed value carrying its five coordinates, used as the cache key and passed to every read
  ([state-architecture.md](./state-architecture.md)).

## Validation at the boundary

Inbound payloads are validated with zod schemas at the adapter boundary before they become DTOs
([praxis-dtos](./praxis-dtos/README.md)): a payload that fails validation is an error, not a silently-mishandled shape.
This is the renderer's guard against a host that sends an unexpected shape — additive MINOR fields are ignored, but a
violated invariant is surfaced as an error rather than trusted
([ADR-0017](../06-adrs/ADR-0017-contract-and-dto-versioning.md)). Validation lives in the adapter, so a component always
receives a validated, typed DTO.

## Error mapping: host → UI

The host returns a stable error envelope ([error-envelope.md](../04-contracts/ipc/error-envelope.md), RFC 9457,
[ADR-0016](../06-adrs/ADR-0016-error-envelope-rfc9457.md)) carrying machine-readable codes (`WORKSPACE_NOT_FOUND`,
`WORKSPACE_LOCKED`, `SCHEMA_TOO_NEW`, `CONFLICT_RECORDED`, `BACKPRESSURE`, …). The adapter maps the code — never the
prose — to a UI outcome ([error-loading-empty.md](./error-loading-empty.md)):

- A code maps to a human-readable message and a next action; correlation ids (`request_id`, `job_id`) are preserved for
  diagnostics.
- A raw error object never reaches a component; the adapter is the single mapping point.
- `BACKPRESSURE` maps to a queued state, not failure; `CONFLICT_RECORDED` maps to the conflict flow; `SCHEMA_TOO_NEW`
  maps to the compatibility message ([ADR-0017](../06-adrs/ADR-0017-contract-and-dto-versioning.md)).

## Accepted work and events

Long-running work returns an `AcceptedJob`; progress arrives via typed events and the surface reflects the lifecycle,
not an indefinite spinner ([ACCEPTED-WORK-AND-EVENTS.md](../04-contracts/ACCEPTED-WORK-AND-EVENTS.md),
[ux/accepted-work-ux.md](../03-design/ux/accepted-work-ux.md)). A mutation carries an idempotency key so a retry after a
transient failure is safe and does not double-apply ([ADR-0018](../06-adrs/ADR-0018-idempotency-and-deduplication.md)).

## Versioning

DTOs and the IPC contract are versioned with Semantic Versioning 2.0.0
([ADR-0017](../06-adrs/ADR-0017-contract-and-dto-versioning.md)): a new optional field or enum variant behind explicit
handling is a MINOR and an older renderer ignores unknown fields; renaming a field, changing a type, or renaming a
stable error code is a MAJOR and is negotiated. The renderer reads newer MINOR payloads by ignoring unknown fields
rather than failing.

## References & standards

_Normative — recorded in the [standards register](../02-standards/STANDARDS-REGISTER.md):_

- **RFC 9457** — Problem Details. The error-envelope shape ([ADR-0016](../06-adrs/ADR-0016-error-envelope-rfc9457.md)).
- **Semantic Versioning 2.0.0**. DTO and contract versioning
  ([ADR-0017](../06-adrs/ADR-0017-contract-and-dto-versioning.md)).
- **JSON Schema 2020-12**. The payload-validation shape zod mirrors at the boundary.

## Related documents

| Document                                                              | What it covers                                     |
| --------------------------------------------------------------------- | -------------------------------------------------- |
| [praxis-adapters](./praxis-adapters/README.md)                        | The adapter interfaces and optimistic-UI contract. |
| [praxis-dtos](./praxis-dtos/README.md)                                | The DTO shapes, branded types, and zod validation. |
| [error-envelope.md](../04-contracts/ipc/error-envelope.md)            | The RFC 9457 envelope errors are mapped from.      |
| [ADR-0006](../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md) | The typed-IPC trust boundary.                      |
| [ADR-0017](../06-adrs/ADR-0017-contract-and-dto-versioning.md)        | The SemVer versioning of contracts and DTOs.       |
| [CONTRACTS-AND-SCHEMAS.md](../04-contracts/CONTRACTS-AND-SCHEMAS.md)  | The IPC manifest and drift-check discipline.       |
