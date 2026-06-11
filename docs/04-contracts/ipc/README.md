# IPC

The wire contract between the renderer and the host: the request/response envelope, the error envelope, the command surface, and the cross-cutting disciplines — versioning, idempotency, correlation, and the generated-schema rule — that every command obeys. The boundary is the typed Tauri IPC command surface ([ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)), not HTTP and not a local server.

The one rule above all others: **Rust owns the wire shape; TypeScript consumes generated types** ([generated-schema-discipline.md](./generated-schema-discipline.md)).

---

## Contents

| #   | File                                                                 | Question it answers                                                      |
| --- | -------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 1   | [envelope.md](./envelope.md)                                         | What is the `IpcRequest` / `IpcResponse` wire shape?                     |
| 2   | [error-envelope.md](./error-envelope.md)                             | How is an error shaped (RFC 9457), categorised, and made recoverable?    |
| 3   | [command-surface.md](./command-surface.md)                           | How are commands namespaced into families, and where is each documented? |
| 4   | [versioning-and-compatibility.md](./versioning-and-compatibility.md) | How does a contract change, and how is compatibility negotiated?         |
| 5   | [idempotency.md](./idempotency.md)                                   | How is a mutation made safe to retry?                                    |
| 6   | [correlation-and-tracing.md](./correlation-and-tracing.md)           | How does one user action stay traceable across the boundary?             |
| 7   | [generated-schema-discipline.md](./generated-schema-discipline.md)   | How is the Rust-owns-shape rule enforced?                                |

---

## How the pieces fit

A renderer call is an [`IpcRequest`](./envelope.md) carrying a `requestId`, a `traceparent` ([correlation-and-tracing.md](./correlation-and-tracing.md)), an `idempotencyKey` on mutations ([idempotency.md](./idempotency.md)), and a typed `payload`. The host returns an [`IpcResponse`](./envelope.md) that is either an `ok` result or an [RFC 9457 error](./error-envelope.md). The payload's shape is owned by Rust and generated for TypeScript ([generated-schema-discipline.md](./generated-schema-discipline.md)); changing it is a [SemVer event](./versioning-and-compatibility.md). Every one of these is a single concern with its own file.

## Explorer gaps closed here

This area records the contract elements an earlier survey found missing or thin:

- **Schema versioning** — [versioning-and-compatibility.md](./versioning-and-compatibility.md) (SemVer per [ADR-0017](../../06-adrs/ADR-0017-contract-and-dto-versioning.md), negotiation, forward-only evolution).
- **A complete error taxonomy** — [error-envelope.md](./error-envelope.md) (RFC 9457 per [ADR-0016](../../06-adrs/ADR-0016-error-envelope-rfc9457.md), five categories, recovery hints).
- **Idempotency in the request envelope** — [idempotency.md](./idempotency.md) (a key on every mutation, per [ADR-0018](../../06-adrs/ADR-0018-idempotency-and-deduplication.md)).
- **Correlation and trace IDs** — [correlation-and-tracing.md](./correlation-and-tracing.md) (W3C Trace Context per [ADR-0019](../../06-adrs/ADR-0019-observability-and-trace-context.md)).

## References & standards

_Normative:_

- **RFC 9457**, Problem Details for HTTP APIs ([ADR-0016](../../06-adrs/ADR-0016-error-envelope-rfc9457.md)).
- **Semantic Versioning 2.0.0** ([ADR-0017](../../06-adrs/ADR-0017-contract-and-dto-versioning.md)).
- **JSON Schema 2020-12** (payload validation).
- IETF — **The Idempotency-Key HTTP Header Field** (draft) ([ADR-0018](../../06-adrs/ADR-0018-idempotency-and-deduplication.md)).
- W3C — **Trace Context**; **OpenTelemetry** ([ADR-0019](../../06-adrs/ADR-0019-observability-and-trace-context.md)).

Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                                  | What it covers                                         |
| ------------------------------------------------------------------------- | ------------------------------------------------------ |
| [Host: IPC command surface](../../05-modules/host/ipc-command-surface.md) | The crate that implements the envelope and commands.   |
| [Host: event bus](../../05-modules/host/event-bus.md)                     | The event channel that pairs with the command surface. |
| [ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)  | The trust boundary and typed IPC decision.             |
