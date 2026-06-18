# Mneme

The storage module for Aideon Desktop. Mneme owns the append-only operation log, the bitemporal facts derived from it, schema-as-data, the content-addressed blob store, and the rebuildable derived runtime that every other module reads through. This folder is the module-level source of truth for how the twin is stored; a reader who needs one answer should open the one file that carries it.

Mneme is named for memory: it remembers everything that was ever asserted, and forgets nothing without an explicit operation that says so.

---

## Contents

1. [The op / fact / schema model](./op-fact-schema-model.md) — the canonical operation, the derived fact, schema-as-data, and the value types.
2. [Bitemporal model and the HLC](./bitemporal-and-hlc.md) — valid time vs asserted time, the packed-`i64` Hybrid Logical Clock, skew, monotonicity, counter overflow.
3. [Scenarios and layers](./scenarios-and-layers.md) — scenario overlays, layer-as-policy, branching vs DAG, merge.
4. [The storage trait and engine](./storage-trait-and-engine.md) — the pluggable storage seam, the single-writer queue, backpressure, snapshot isolation.
5. [Derived runtime and projections](./derived-runtime-and-projections.md) — the three consistency tiers, rebuild correctness, incremental view maintenance.
6. [Content-addressed blobs](./content-addressed-blobs.md) — hash-addressed immutable storage, deduplication, integrity, garbage collection.
7. [Export, import, and replay](./export-import-replay.md) — the canonical NDJSON package, idempotent import, snapshot-plus-tail acceleration.
8. [Runtime and engine layout](./RUNTIME-AND-ENGINE.md) — keyspace and index layout, the query path, the engine bake-off.
9. [SQLite specification](./SQLITE.md) — the default derived-runtime engine: table families, indexes, WAL, migrations, constraints.
10. [Failure modes and recovery](./failure-modes.md) — what breaks, how it is detected, and how it recovers.
11. [Performance budget](./performance-budget.md) — the design-intent targets and the bounds that justify them.
12. [Boundaries](./boundaries.md) — what Mneme owns and, more importantly, what it does not.
13. [Identifier generation and provenance](./identifier-generation-and-provenance.md) — the four identifier namespaces and the provenance every fact and operation carries.
14. [Schema migration patterns](./schema-migration-patterns.md) — the forward-only migration op-types, re-validation on replay, and multi-package coordination.
15. [Workspace integrity and recovery](./workspace-integrity-and-recovery.md) — locking, segment sealing, checksums, blob GC, and torn-write recovery.

---

## One-line responsibility

Mneme is the only module that touches canonical storage. It turns the append-only operation log and schema-as-data in the [workspace](../../../CONTEXT.md) folder into resolvable [facts](../../../CONTEXT.md), and maintains a derived runtime that makes those facts fast to read — without ever becoming the source of truth itself.

---

## Invariants

These rules are non-negotiable. Every file in this folder upholds them; a change that breaks one is a defect, not a trade-off.

| Invariant                                 | Statement                                                                                                                                                            | Backed by                                                                                                                                              |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Workspace is canonical**                | The canonical truth is the op log plus schema-as-data in the workspace folder. Nothing authoritative lives only in the derived runtime.                              | [ADR-0001](../../06-adrs/ADR-0001-workspace-is-canonical-authority.md), [canonical-vs-derived](../../01-architecture/boundary/canonical-vs-derived.md) |
| **The op log is append-only**             | An operation, once written, is never mutated or deleted. Change is expressed by appending a later, superseding operation.                                            | [ADR-0001](../../06-adrs/ADR-0001-workspace-is-canonical-authority.md)                                                                                 |
| **Rebuild is lossless and deterministic** | Deleting `.aideon/runtime/` and replaying the op log must reproduce the same resolved twin — the same facts and the same effective graphs at the same viewpoints.    | [ADR-0007](../../06-adrs/ADR-0007-deterministic-package-export.md), [ADR-0027](../../06-adrs/ADR-0027-projection-consistency-model.md)                 |
| **One writer per workspace**              | Writes serialise through a single-writer queue per open workspace; saturation surfaces as an explicit `BACKPRESSURE` result, never a silent drop or unbounded queue. | [ADR-0004](../../06-adrs/ADR-0004-storage-engine-abstraction.md)                                                                                       |
| **Asserted time is an HLC**               | Every operation carries an asserted time that is a Hybrid Logical Clock packed into a portable, byte-comparable signed `i64`.                                        | [ADR-0022](../../06-adrs/ADR-0022-hlc-clock-model.md)                                                                                                  |
| **Blobs are content-addressed**           | Large binary values are stored once under their own hash and referenced by hash; the blob store is immutable and integrity-checked.                                  | [ADR-0003](../../06-adrs/ADR-0003-content-addressed-object-store.md)                                                                                   |
| **No consumer touches storage directly**  | Every other module reads and writes only through Mneme's published trait surface; no consumer generates SQL or opens the runtime database.                           | [ADR-0004](../../06-adrs/ADR-0004-storage-engine-abstraction.md), [dependency-rules](../../01-architecture/boundary/dependency-rules.md)               |
| **The engine is replaceable**             | The runtime engine sits behind a narrow storage trait; SQLite is the current default, swappable without changing the canonical format or any caller.                 | [ADR-0004](../../06-adrs/ADR-0004-storage-engine-abstraction.md)                                                                                       |

---

## What Mneme owns, and what it does not

Mneme **owns**: the operation log; bitemporal fact resolution inputs; schema-as-data persistence and the compiled effective schema cache; the content-addressed blob store; the derived runtime database and its projections; the storage trait that fixes the seam; export, import, and replay.

Mneme **does not own**: the default enterprise-architecture metamodel or business vocabulary (Praxis); analytics meaning — what a score means (Metis); time and scenario _interpretation_ — viewpoint resolution policy and diff classification as a product concern (Chrona); orchestration and the run ledger (Continuum); the application shell, workspace lifecycle UX, or the IPC boundary (Host). The full list is in [boundaries](./boundaries.md).

A deliberate seam runs through the temporal model. Mneme implements the mechanical resolution of facts — containment, specificity, asserted-time order, op-id tie-break — exactly as fixed by the [temporal and scenario contract](../../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md). Chrona owns the _product-level_ interpretation built on top: how a viewpoint is presented, how a diff is classified, how a scenario composition is shaped for a surface. Mneme answers "which fact wins?"; Chrona answers "what does the user see, and why?".

---

## The crate split

| Crate         | Role                                                                                                                                                                         |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mneme_core`  | Core types — the op / fact / schema / time model — and the full storage trait surface. Shared boundary types live here so consumers depend on contracts, not implementation. |
| `mneme_store` | The embedded store implementation: projections, migrations, the SQLite adapter, the single-writer queue.                                                                     |
| `mneme`       | The façade — re-exports both crates under `mneme::core` and `mneme::store`. Consumers depend on `mneme`.                                                                     |

The split is structural enforcement of the acyclic dependency invariant: shared types sit in `mneme_core`, below both consumers and the store, so no lateral or upward import can form a cycle ([dependency-rules](../../01-architecture/boundary/dependency-rules.md)).

---

## The canonical workspace layout

```text
my-project.aideon/
  manifest.json        CANONICAL — identity, schema version, module metadata
  model/ops/           CANONICAL — append-only operation segments (time-ordered)
  model/schema/        CANONICAL — schema-as-data (type/field/rule batches)
  objects/sha256/      CANONICAL — content-addressed immutable blobs
  docs/                CANONICAL — notes, imports, unstructured attachments
  .aideon/runtime/     DERIVED   — indexes, projections, search/vector, runtime DB
```

The folder is the unit of copy, zip, share, and sync. The shape is fixed by [ADR-0002](../../06-adrs/ADR-0002-portable-workspace-format.md); the full contract is [DESKTOP-FIRST-WORKSPACE](../../03-design/DESKTOP-FIRST-WORKSPACE.md).

---

## References & standards

_Normative:_

- Fowler; Young — **Event Sourcing & CQRS**. The append-only operation log as truth, with derived read models rebuilt from it. _(storage shape)_

_Informative:_

- Kleppmann — _Designing Data-Intensive Applications_, 2017. Log-structured storage and derived-data discipline.

The full bibliography is the [standards register](../../02-standards/STANDARDS-REGISTER.md); individual claims are cited in the file that makes them.

## Related documents

| Document                                                                             | What it covers                                                                  |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| [Canonical vs derived](../../01-architecture/boundary/canonical-vs-derived.md)       | The deciding rule for what is canonical, and the rebuild-correctness statement. |
| [Temporal and scenario context](../../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md) | The bitemporal resolution and scenario contract Mneme implements.               |
| [Projection and invalidation](../../04-contracts/PROJECTION-AND-INVALIDATION.md)     | The projection-freshness contract between Mneme and its consumers.              |
| [Chrona module](../chrona/README.md)                                                 | The product-level interpretation of time and scenario built on Mneme.           |
| [Praxis module](../praxis/README.md)                                                 | The metamodel and meaning Mneme persists as schema-as-data.                     |
| [DESKTOP-FIRST-WORKSPACE](../../03-design/DESKTOP-FIRST-WORKSPACE.md)                | The full workspace folder contract.                                             |
