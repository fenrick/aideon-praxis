# Export, import, and replay

How a workspace's canonical truth leaves and re-enters Mneme: the op-log export package, idempotent and order-robust
import, and the snapshot-plus-tail acceleration that avoids replaying the whole log. The op log is the canonical export
format; deterministic export is fixed by [ADR-0007](../../06-adrs/ADR-0007-deterministic-package-export.md).

---

## The op log is the export format

Because the op log is canonical and the runtime is derived
([canonical-vs-derived](../../01-architecture/boundary/canonical-vs-derived.md)), exporting a workspace means exporting
its operations — never its caches. Mneme ships streaming export and import APIs (`MnemeExportApi`, `MnemeImportApi`)
producing NDJSON records. The `op` record **embeds the canonical operation object verbatim** — there is no second
representation and no `payload_base64`:

```text
{ "record_type": "header", "format_version": …, "partition_id": …, "exported_at_asserted": … }
{ "record_type": "op", "op": { …canonical operation object… } }
{ "record_type": "footer", "op_count": …, "checksum": … }   // BLAKE3 over all op records
```

The embedded `op` object is the same typed canonical record written to the `model/ops/` segment — envelope (`op_id`,
`actor_id`, `asserted_at`, `kind`, `format_version`, `deps`) plus the typed `payload` object — encoded with the
[canonical-JSON profile](../../04-contracts/canonical-json.md)
([ADR-0038](../../06-adrs/ADR-0038-canonical-operation-record-identity-and-commit-protocol.md)). The payload is
structured, not base64-wrapped opaque bytes.

Derived artefacts are **never** exported; they are rebuilt after import by the processing worker
([derived-runtime-and-projections](./derived-runtime-and-projections.md)). The footer checksum is BLAKE3 over the op
records, so a truncated or tampered package is detected on import.

### Determinism

A deterministic export is one where the same workspace state produces a byte-identical package, regardless of when or
where it is exported ([ADR-0007](../../06-adrs/ADR-0007-deterministic-package-export.md)). Determinism rests on the same
property as rebuild correctness: operations are ordered by asserted time (a total order, since the HLC is
byte-comparable — [bitemporal-and-hlc](./bitemporal-and-hlc.md)), and the runtime is a pure function of them. This is
what lets two exports be compared for equality, and what makes a package safe to diff in version control.

### Package export reuses the canonical segment bytes

A **package** export does not re-serialise each operation. It **seals the loose `model/ops/` segment** (no further
appends to the current segment) and **copies the canonical segment files byte-for-byte** into the deterministic archive
([ADR-0038](../../06-adrs/ADR-0038-canonical-operation-record-identity-and-commit-protocol.md)). Because the live
segment already holds the canonical record bytes and its BLAKE3 checksum covers those exact op-line bytes, the package
inherits canonical-history integrity rather than re-deriving it. The archive itself is deterministic per
[ADR-0007](../../06-adrs/ADR-0007-deterministic-package-export.md): sorted paths, normalised timestamps, stable
permissions, and stripped incidental zip metadata, so the same sealed state yields a byte-identical package. (The
streaming NDJSON form above is the line-oriented alternative for piping and diffing; both carry the same canonical
operation objects.)

---

## Import is idempotent and order-robust

Import re-ingests operations into a workspace. Two properties make it safe:

- **Idempotent.** The op log is idempotent on ingest — the same `(partition, op_id)` is a no-op on replay
  ([op-fact-schema-model](./op-fact-schema-model.md)). Importing the same package twice yields the same twin; a partial
  import that is retried completes without duplicating the operations that already landed
  ([ADR-0018](../../06-adrs/ADR-0018-idempotency-and-deduplication.md)).
- **Order-robust (for cross-source op sets).** Operations carry causal dependencies (`deps`) and an asserted time, so a
  foreign op set need not arrive in a particular order — the outcome is fixed by `(asserted_at, op_id)` and the
  resolution rules, not by arrival order. The two cases differ, and **neither is part of M0's local rebuild path** (M0
  segments carry empty `deps` and replay in physical segment order —
  [ADR-0038](../../06-adrs/ADR-0038-canonical-operation-record-identity-and-commit-protocol.md)):
  - **Complete package or batch import.** Validate that every referenced dependency exists in the workspace or the
    package; reject dependency cycles; topologically order the causally-constrained operations with
    `(asserted_at, op_id)` as the stable tie-break among ready ones; **reject the package** if a required predecessor is
    absent (a complete set that omits a dependency is incomplete or corrupt).
  - **Streaming Koinon sync.** An operation whose predecessor has not yet arrived is **staged as causally pending**, not
    rejected — the protocol awaits or requests the missing predecessor and applies the operation when its dependencies
    are available, surfacing a failure only if they never arrive
    ([ADR-0034](../../06-adrs/ADR-0034-merge-correctness-and-convergence.md)). Whether pending operations are appended
    immediately or held in a verified staging area is fixed by the Koinon protocol, not here.

After import, derived artefacts are rebuilt as an [accepted job](../../04-contracts/ACCEPTED-WORK-AND-EVENTS.md), so a
large import does not block the renderer and its progress is visible.

---

## Snapshot-plus-tail acceleration

Replaying a long op log from the beginning is `O(N)` in operations — the cost the rebuild-correctness invariant accepts
([derived-runtime-and-projections](./derived-runtime-and-projections.md)). `MnemeSnapshotApi` provides an accelerated
path that does not weaken the invariant:

1. Export the resolved entity and fact state at a chosen asserted-time checkpoint — a snapshot of _derived_ state,
   marked as such.
2. On restore, load the snapshot, then replay only the **tail** operations asserted after the checkpoint.

The correctness condition is explicit: **snapshot plus tail replay produces identical resolution to a full replay.** The
snapshot is an optimisation, not a new source of truth — it is checkable against a full replay exactly the way
incremental projection refresh is checkable against a full rebuild _(Gupta & Mumick, Maintenance of Materialized Views,
1995; [ADR-0027](../../06-adrs/ADR-0027-projection-consistency-model.md))_. If the snapshot is missing or fails its
check, the system falls back to a full replay from the op log.

The trade-off named: a snapshot trades storage (it duplicates derived state at a point in time) and a small staleness
window (the tail) for a much faster cold open on a large workspace. It never becomes canonical — deleting every snapshot
loses nothing, because the op log can always reproduce them.

---

## Worked example — moving a workspace between machines

A consultant exports the seed workspace after the FY26 planning session and restores it on a colleague's machine:

1. **Export.** `MnemeExportApi` streams a header, one `op` record per operation — including the `baseline-graph`
   operations (the twelve entities, ten relationships) and the `baseline-plan` operations (the two `PlanEvent`s and
   their `plan_effect` relationships) — and a footer with the BLAKE3 checksum over those records. No runtime tables are
   exported.
2. **Transfer.** The NDJSON package and the `objects/sha256/` directory travel together; the package is byte-identical
   to one exported from the same state on the original machine
   ([ADR-0007](../../06-adrs/ADR-0007-deterministic-package-export.md)).
3. **Import.** The colleague imports; the footer checksum verifies the package is intact, the operations are validated
   and processed in causal dependency order (a complete package with an absent predecessor is rejected as incomplete),
   and facts are derived. The runtime is rebuilt as an accepted job.
4. **Equivalence.** Resolving `Automation Orchestrator`'s `disposition` at any viewpoint on the colleague's machine
   yields the same fact as on the original — the import reproduced the twin, not merely copied a cache.
5. A re-import of the same package is a no-op: every `op_id` already exists.

---

## Bounds and failure modes

- **Full replay** on import is `O(N)` in operations; **snapshot-plus-tail** is `O(snapshot load + tail)`.
- A **truncated package** is caught by the footer checksum; import refuses the package rather than ingesting a partial
  log.
- A **missing dependency** in a _complete package_ (a referenced `dep_op_id` absent from the package and the workspace)
  **rejects** the package — it is incomplete or corrupt; import never silently applies an operation whose causal
  predecessor is missing. In _streaming sync_ the same operation is instead staged as causally pending until its
  predecessor arrives ([ADR-0034](../../06-adrs/ADR-0034-merge-correctness-and-convergence.md)) — out-of-order delivery
  is not a permanent rejection.
- A **format-version mismatch** newer than the importer understands is rejected with a clear diagnostic, never partially
  interpreted.

---

## References & standards

_Normative:_

- Fowler; Young — **Event Sourcing & CQRS**. The op log as the canonical, replayable export format.

_Informative:_

- Gupta & Mumick — _Maintenance of Materialized Views_, 1995. The rebuild-equivalence condition the snapshot path is
  checked against.

## Related documents

| Document                                                                                      | What it covers                                                |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| [ADR-0007](../../06-adrs/ADR-0007-deterministic-package-export.md)                            | Deterministic package export.                                 |
| [ADR-0038](../../06-adrs/ADR-0038-canonical-operation-record-identity-and-commit-protocol.md) | The canonical operation record the package embeds and copies. |
| [canonical-JSON profile](../../04-contracts/canonical-json.md)                                | The byte-exact serialisation of the embedded op object.       |
| [ADR-0018](../../06-adrs/ADR-0018-idempotency-and-deduplication.md)                           | Idempotent ingest under retry.                                |
| [The op / fact / schema model](./op-fact-schema-model.md)                                     | The operation envelope the package serialises.                |
| [Derived runtime and projections](./derived-runtime-and-projections.md)                       | Why derived artefacts are rebuilt, not exported.              |
| [ACCEPTED-WORK-AND-EVENTS](../../04-contracts/ACCEPTED-WORK-AND-EVENTS.md)                    | The accepted-job model a large import runs under.             |
