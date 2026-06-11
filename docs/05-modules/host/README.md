# Host — the Tauri trust boundary

The Host (`src-tauri`, crate `aideon_desktop`) is the Tauri v2 runtime and the sole security boundary between the renderer and every engine in the Aideon Desktop process. It is the composition root: it owns the typed IPC surface, capability enforcement, workspace lifecycle, job orchestration, the event bus, and OS integration. It owns no domain logic — analytics, graph traversal, and meaning all live in the engine crates behind their traits.

This README is the index and the cross-cutting narrative; each focused topic lives in its own file, per the [Documentation Standard §4](../../02-standards/DOCUMENTATION-STANDARD.md) granularity rule.

---

## Contents

1. [Process and trust boundary](./process-and-trust-boundary.md) — the process model, the hard invariants, and why the renderer is untrusted.
2. [Capabilities and CSP](./capabilities-and-csp.md) — Tauri capabilities, the permission bundle, the content-security policy, and the filesystem boundary.
3. [IPC command surface](./ipc-command-surface.md) — the request/response envelope, the error contract, and the registered commands.
4. [Accepted work and backpressure](./accepted-work-and-backpressure.md) — long work as accepted jobs, the backpressure signalling contract, and cancellation.
5. [Engine wiring](./engine-wiring.md) — how the host reaches engines via the engine harness, and bulkhead isolation between them.
6. [Workspace lifecycle](./workspace-lifecycle.md) — open, validate, migrate, close, and recovery mode.
7. [Event bus](./event-bus.md) — host → renderer events and the missed-event tolerance rule.
8. [Window and splash](./window-and-splash.md) — the window model, splash gating, and window isolation.
9. [Observability](./observability.md) — tracing, error recovery, circuit breakers, and the IPC timeout SLA.
10. [Boundaries](./boundaries.md) — what the host depends on and what may never depend on it.

---

## One-line responsibility

The host validates and dispatches every typed command across the trust boundary, composes the engines behind their traits, runs long work as inspectable jobs, and pushes events to the renderer — and is the one place side effects are allowed to happen.

---

## The host owns

- **Windowing** — create, label, size, style, and focus all windows; apply platform-native chrome ([window and splash](./window-and-splash.md)).
- **Security and capability enforcement** — declare Tauri capabilities, scope permissions per window, default-deny all IPC, gate every command through a named permission ([capabilities and CSP](./capabilities-and-csp.md)).
- **The IPC façade** — validate and dispatch typed commands; return a stable error envelope; never leak raw Rust error strings ([IPC command surface](./ipc-command-surface.md)).
- **Workspace lifecycle** — open, validate, and coordinate teardown; own filesystem path resolution ([workspace lifecycle](./workspace-lifecycle.md)).
- **Job orchestration** — run long work asynchronously, emit typed progress events, support cancellation and backpressure ([accepted work and backpressure](./accepted-work-and-backpressure.md)).
- **Event distribution** — push host → renderer events over the Tauri event bus ([event bus](./event-bus.md)).
- **Engine wiring** — hold trait-object references to the engines via the harness; route commands and jobs to the correct engine; keep engines unaware of each other ([engine wiring](./engine-wiring.md)).

The host is **not** responsible for domain logic, analytics, graph traversal, or rendering.

---

## It is the security boundary

The host's defining property is that it _is_ the trust boundary. The renderer is untrusted: Rust owns all side effects, the WebView gets only what is exposed through IPC, and capabilities decide which window may call which command ([ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)). That boundary is threat-modelled with STRIDE and verified against OWASP ASVS 5.0 ([ADR-0023](../../06-adrs/ADR-0023-threat-model-stride-asvs.md)). The renderer-untrusted invariant is the load-bearing control across most threat categories, which is why so much of the host's design is boundary discipline rather than feature surface ([process and trust boundary](./process-and-trust-boundary.md)).

---

## References & standards

_Normative:_

- **Tauri security model** (capabilities, permissions, CSP, isolation) — the renderer/host trust-boundary mechanism ([ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)).
- Microsoft — **STRIDE**; **OWASP ASVS 5.0** — the threat model and verification controls ([ADR-0023](../../06-adrs/ADR-0023-threat-model-stride-asvs.md)).
- **OpenTelemetry**; W3C **Trace Context** — tracing and propagation ([ADR-0019](../../06-adrs/ADR-0019-observability-and-trace-context.md)).
- **RFC 9457** — the error envelope ([ADR-0016](../../06-adrs/ADR-0016-error-envelope-rfc9457.md)).

Full bibliography: [STANDARDS-REGISTER.md](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                                   | What it covers                                            |
| -------------------------------------------------------------------------- | --------------------------------------------------------- |
| [Architecture boundary](../../01-architecture/ARCHITECTURE-BOUNDARY.md)    | Process boundary rules; renderer/host/engine separation.  |
| [Module dependency map](../../01-architecture/module-dependency-map.md)    | The crate dependency graph; the host as composition root. |
| [Contracts and schemas](../../04-contracts/CONTRACTS-AND-SCHEMAS.md)       | The IPC envelope schema and DTO stability rules.          |
| [Accepted work and events](../../04-contracts/ACCEPTED-WORK-AND-EVENTS.md) | The job model, progress events, and backpressure.         |
| [Engine harness](../engine/README.md)                                      | The crate that binds engines behind traits for the host.  |
| [SECURITY.md](../../02-standards/SECURITY.md)                              | CSP, capability policy, and the per-concern ASVS mapping. |
