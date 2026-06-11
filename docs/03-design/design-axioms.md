# Design Axioms

The ten invariants the whole product upholds. These are non-negotiable: every module, renderer surface, and host capability must stay consistent with them, and a design that contradicts one is a defect, not a trade-off. Each is fixed by an ADR or a canonical contract; this document states the axiom and points at where it is decided.

---

## 1. The workspace is the canonical authority

The canonical source of truth is the **portable workspace folder** — not a database file and not a local service. Everything under `model/` (operation segments, schema-as-data) and `objects/` (content-addressed blobs) is canonical; everything under `.aideon/runtime/` (indexes, projections, search and vector sidecars, checkpoints) is derived and disposable. Delete the runtime and the workspace still opens; rebuild it and you recover the same effective graph. Fixed by [ADR-0001](../06-adrs/ADR-0001-workspace-is-canonical-authority.md); shape in [ADR-0002](../06-adrs/ADR-0002-portable-workspace-format.md). See [desktop-first-workspace/](./desktop-first-workspace/README.md).

## 2. Operations and facts are canonical; everything else is derived

The append-only **operation** log is the durable record. **Facts** are derived temporal claims; effective graphs, tuple indexes, adjacency, search and vector sidecars, projection caches, and analytics outputs are all rebuildable from canonical files alone. When a derived output disagrees with the op log, the op log wins (Fowler/Young, Event Sourcing & CQRS). See [ADR-0027](../06-adrs/ADR-0027-projection-consistency-model.md).

## 3. Time is explicit and first-class

Every read and write carries a **viewpoint**: an as-of valid time, an as-of asserted time, a layer or layer policy, a scenario, and a scope ([`CONTEXT.md`](../../CONTEXT.md)). Time and scenario are model-level context, never UI-only filters. [Chrona](../05-modules/chrona/README.md) owns viewpoint resolution and scenario composition; asserted time is recorded as a Hybrid Logical Clock timestamp ([ADR-0022](../06-adrs/ADR-0022-hlc-clock-model.md)). The contract is [TEMPORAL-AND-SCENARIO-CONTEXT.md](../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md); the temporal model is [ADR-0009](../06-adrs/ADR-0009-temporal-model-valid-interval-layer-policy-viewpoint.md).

## 4. Meaning is separate from storage

[Praxis](../05-modules/praxis/README.md) defines semantics — metamodel, types, edge catalogue, tasks, artefact execution, integrity scoring, explainability. [Mneme](../05-modules/mneme/README.md) owns persistence — op log, temporal facts, schema-as-data, blob store, derived runtime. Neither imports the other's implementation; they communicate through typed traits. Fixed by [ADR-0011](../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md).

## 5. Artefacts are the primary product

Users consume **artefacts** — results in the forms view, catalogue, matrix, map, report, page — executed at an explicit viewpoint. The renderer embeds no traversal rules, no analytics, and no semantic meaning. Each [artefact result](../../CONTEXT.md) carries its own explanation, integrity gate, and content classification. See [artefacts/](./artefacts/README.md).

## 6. The host is the security boundary

The renderer (React/WebView) is **untrusted and disposable**. All side effects — filesystem writes, job dispatch, capability invocation, workspace lifecycle — flow through the Rust host over **typed Tauri IPC**. The renderer makes no direct filesystem calls and opens no local HTTP ports; the desktop baseline is offline-first (Tauri security model). Fixed by [ADR-0006](../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md); threat model in [ADR-0023](../06-adrs/ADR-0023-threat-model-stride-asvs.md).

## 7. Non-trivial work is accepted, with backpressure

Non-trivial writes, recalculations, import/export, and propagation are **accepted first, then executed** through a single-writer queue with explicit status, progress events, cancellation, and retry. Long-running work is never a silent spinner. [Continuum](../05-modules/continuum/README.md) owns local durable orchestration; the IPC surface enforces backpressure so the renderer cannot flood the host. Contract: [ACCEPTED-WORK-AND-EVENTS.md](../04-contracts/ACCEPTED-WORK-AND-EVENTS.md); idempotency: [ADR-0018](../06-adrs/ADR-0018-idempotency-and-deduplication.md).

## 8. Binary content is content-addressed

Images, attachments, and generated assets live outside the fact log in `objects/sha256/`, referenced by hash. The fact log never embeds raw bytes; blob integrity is verifiable by hash; exports are deterministic and reproducible (Merkle; Git internals; IPFS). Fixed by [ADR-0003](../06-adrs/ADR-0003-content-addressed-object-store.md) and [ADR-0007](../06-adrs/ADR-0007-deterministic-package-export.md).

## 9. The storage engine is pluggable

Mneme's persistence sits behind a typed trait with a single-writer queue. The local default engine (SQLite, WAL mode) is replaceable without changing modules above it; a hosted adapter is an optional materialisation, not the definition of truth. Fixed by [ADR-0004](../06-adrs/ADR-0004-storage-engine-abstraction.md).

## 10. Execution is bounded and explainable

Every user-triggered computation carries explicit bounds — fanout, depth, size, and duration limits — and exposes its reasoning. The product declares when a result is partial, bounded, stale, inferred, or generated, using the [unified honest-state vocabulary](./trust-and-honesty.md) and never a quality word in place of evidence. Integrity is scored per [ADR-0020](../06-adrs/ADR-0020-integrity-scoring-model.md); confidence per [ADR-0021](../06-adrs/ADR-0021-confidence-and-trust-scale.md); analytics bounds per [analytics/](./analytics/README.md).

---

## The trade-off these axioms accept

A canonical op log plus derived runtime is heavier to build than a single mutable database, and explicit honest-state and accepted-work treatment costs surface area that an optimistic UI would not spend. The product accepts that cost deliberately: it buys portability, auditability, mergeability, and a product that can be trusted under scrutiny rather than only when it happens to be right.

## References & standards

_Normative:_

- Fowler; Young — **Event Sourcing & CQRS**. Append-only truth, derived read models (axioms 1, 2).
- **Tauri security model** (capabilities, permissions, CSP, isolation). The renderer/host boundary (axiom 6).
- Merkle, 1987; **Git internals**; IPFS — content-addressable storage (axiom 8).

Recorded in the [standards register](../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                                                | What it covers                                     |
| --------------------------------------------------------------------------------------- | -------------------------------------------------- |
| [README.md](./README.md)                                                                | The product design layer index.                    |
| [the-shell.md](./the-shell.md)                                                          | The shared shell the axioms are expressed through. |
| [trust-and-honesty.md](./trust-and-honesty.md)                                          | The honest-state obligations (axiom 10).           |
| [01-architecture/ARCHITECTURE-BOUNDARY.md](../01-architecture/ARCHITECTURE-BOUNDARY.md) | The module boundaries and typed seams.             |
| [06-adrs/ADRS.md](../06-adrs/ADRS.md)                                                   | The decisions that fix these invariants.           |
