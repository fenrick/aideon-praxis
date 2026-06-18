# Contracts

The typed shapes that bind the renderer to the host and the host to the engines. This layer is the interface reference: it says what crosses the IPC boundary, in what shape, with what semantics, and how that shape is allowed to change. A practitioner extending or auditing a boundary reads this layer to know the contract without reading the implementation.

---

## The rule that governs every shape

**Rust owns the wire shape. TypeScript consumes generated types. No exceptions.**

Payload structs are defined once in Rust with `serde`. TypeScript types are generated from those definitions; the JSON Schemas (JSON Schema 2020-12) are generated from the same source. An ad-hoc DTO or a hand-mirrored TypeScript shape that diverges from the Rust source is a contract violation, caught by the CI drift check ([generated-schema discipline](./ipc/generated-schema-discipline.md)). The boundary is the typed IPC command surface ([ADR-0006](../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)) — not HTTP, not a local server.

Two consequences follow, and they shape every document in this layer:

- **There is one source of truth per shape.** A field exists because a Rust struct declares it. The renderer never invents a field; it consumes what the host emits.
- **A change to a shape is a versioned event.** The drift check fails the build; the change is then a SemVer decision ([versioning and compatibility](./ipc/versioning-and-compatibility.md)), not a silent edit.

The trade-off this rule closes: the renderer cannot evolve its data model independently of the host. A renderer-only field is impossible by construction. The benefit is that the two sides cannot drift apart undetected; the cost is that every shared shape change is a cross-boundary change with a CI gate and a version implication.

---

## The four contract areas

Each area is a folder of small, single-topic files behind an index. The index carries the cross-cutting narrative; the files answer one question each.

| Area                              | What it binds                                                                                                                                                          | Index                                                                   |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| **Temporal and scenario context** | The `Viewpoint` that every time-aware read and write carries, and how facts resolve deterministically into a snapshot                                                  | [temporal-and-scenario/](./temporal-and-scenario/README.md)             |
| **IPC**                           | The request/response envelope, the RFC 9457 error envelope, the command surface, versioning, idempotency, correlation, and the generated-schema discipline             | [ipc/](./ipc/README.md)                                                 |
| **Projection and invalidation**   | The `ProjectionDescriptor`, freshness classes, invalidation events, the consistency guarantee, and the rebuild-from-workspace oracle                                   | [projection-and-invalidation/](./projection-and-invalidation/README.md) |
| **Accepted work and events**      | The `AcceptedJob` envelope, the run-and-step lifecycle, the typed event model, the durable run ledger, backpressure, and control operations                            | [accepted-work-and-events/](./accepted-work-and-events/README.md)       |
| **Artefact results**              | The typed output a renderer receives for each artefact form (view, catalogue, matrix, map, report, page), with carried provenance and pagination/partial-result fields | [artefact-results/](./artefact-results/README.md)                       |

These five are not independent. A long-running command returns an [accepted-work](./accepted-work-and-events/README.md) envelope; its progress events are [typed events](./accepted-work-and-events/event-model.md) deduplicated by `eventId`; completing it emits a [projection invalidation](./projection-and-invalidation/invalidation-events.md); every command and event carries the [correlation context](./ipc/correlation-and-tracing.md) that joins them; and a failure on any of them is the same [RFC 9457 error envelope](./ipc/error-envelope.md). A time-aware read on any of these surfaces carries a [`Viewpoint`](./temporal-and-scenario/viewpoint-shape.md).

Underneath every byte-stable surface — the canonical operation record, deterministic export, the identity/corruption comparison, and the rebuild-equivalence hash — sits one shared, versioned [**canonical JSON profile**](./canonical-json.md): sorted keys, pinned scalar encodings (UUIDs lower-case, full-range 64-bit coordinates as decimal strings), and explicit optional/empty handling, so the same logical value has exactly one byte form ([ADR-0038](../06-adrs/ADR-0038-canonical-operation-record-identity-and-commit-protocol.md)).

---

## The contract families on the wire

The IPC command surface groups into six families, all sharing the one request/response envelope and the one error envelope:

| #   | Family                        | Owner            | Where it is documented                                            |
| --- | ----------------------------- | ---------------- | ----------------------------------------------------------------- |
| 1   | IPC envelope and errors       | Host             | [ipc/](./ipc/README.md)                                           |
| 2   | Temporal query context        | Chrona / Mneme   | [temporal-and-scenario/](./temporal-and-scenario/README.md)       |
| 3   | Mneme store operations        | Mneme            | [Mneme module](../05-modules/mneme/README.md)                     |
| 4   | Chrona temporal operations    | Chrona           | [Chrona module](../05-modules/chrona/README.md)                   |
| 5   | Praxis artefact and workspace | Praxis           | [Praxis module](../05-modules/praxis/README.md)                   |
| 6   | Accepted work and events      | Continuum / Host | [accepted-work-and-events/](./accepted-work-and-events/README.md) |

The executable snapshot of every command name is the [IPC manifest](../contracts/ipc-manifest.json); the event names are the [event manifest](../contracts/event-manifest.json). Both are generated and drift-checked ([generated-schema discipline](./ipc/generated-schema-discipline.md)).

---

## References & standards

_Normative for this layer:_

- **JSON Schema 2020-12** — validation schemas generated from the Rust source.
- **RFC 9457**, Problem Details for HTTP APIs — the error-envelope shape ([ADR-0016](../06-adrs/ADR-0016-error-envelope-rfc9457.md)).
- **Semantic Versioning 2.0.0** — DTO and contract versioning ([ADR-0017](../06-adrs/ADR-0017-contract-and-dto-versioning.md)).

Full bibliography: the [standards register](../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                               | What it covers                                                                  |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| [DOCUMENTATION-STANDARD.md](../02-standards/DOCUMENTATION-STANDARD.md) | The voice, granularity, scales, and honest-state vocabulary this layer follows. |
| [`CONTEXT.md`](../../CONTEXT.md)                                       | The canonical glossary — viewpoint, fact, operation, layer, scenario, scope.    |
| [ADR-0006](../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)  | The trust boundary and typed IPC seam this whole layer rides on.                |
| [Host module](../05-modules/host/README.md)                            | The crate that implements the IPC boundary and the event bus.                   |
| [01-architecture](../01-architecture/README.md)                        | Where this layer sits in the system shape.                                      |
