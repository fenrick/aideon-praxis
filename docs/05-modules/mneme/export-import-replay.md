# Export, import, and replay

How a workspace's canonical truth leaves and re-enters Mneme: the op-log export package, idempotent and order-robust import, and the snapshot-plus-tail acceleration that avoids replaying the whole log. The op log is the canonical export format; deterministic export is fixed by [ADR-0007](../../06-adrs/ADR-0007-deterministic-package-export.md).

---

## The op log is the export format

Because the op log is canonical and the runtime is derived ([canonical-vs-derived](../../01-architecture/boundary/canonical-vs-derived.md)), exporting a workspace means exporting its operations — never its caches. Mneme ships streaming export and import APIs (`MnemeExportApi`, `MnemeImportApi`) producing NDJSON records:

```text
{ "record_type": "header", "format_version": …, "partition_id": …, "exported_at_asserted": … }
{ "record_type": "op", "op_id": …, "actor_id": …, "asserted_at": …, "op_type": …, "payload_base64": …, "deps": […] }
{ "record_type": "footer", "op_count": …, "checksum": … }   // BLAKE3 over all op records
```

Derived artefacts are **never** exported; they are rebuilt after import by the processing worker ([derived-runtime-and-projections](./derived-runtime-and-projections.md)). The footer checksum is computed over the op records, so a truncated or tampered package is detected on import.

### Determinism

A deterministic export is one where the same workspace state produces a byte-identical package, regardless of when or where it is exported ([ADR-0007](../../06-adrs/ADR-0007-deterministic-package-export.md)). Determinism rests on the same property as rebuild correctness: operations are ordered by asserted time (a total order, since the HLC is byte-comparable — [bitemporal-and-hlc](./bitemporal-and-hlc.md)), and the runtime is a pure function of them. This is what lets two exports be compared for equality, and what makes a package safe to diff in version control.

---

## Import is idempotent and order-robust

Import re-ingests operations into a workspace. Two properties make it safe:

- **Idempotent.** The op log is idempotent on ingest — the same `(partition, op_id)` is a no-op on replay ([op-fact-schema-model](./op-fact-schema-model.md)). Importing the same package twice yields the same twin; a partial import that is retried completes without duplicating the operations that already landed ([ADR-0018](../../06-adrs/ADR-0018-idempotency-and-deduplication.md)).
- **Order-robust.** Operations carry causal dependencies (`deps`) and an asserted time, so import does not require the records to arrive in a particular order — it resolves dependencies and applies operations in a valid order, then derives facts. Asserted time, not arrival order, fixes the resolution outcome.

After import, derived artefacts are rebuilt as an [accepted job](../../04-contracts/ACCEPTED-WORK-AND-EVENTS.md), so a large import does not block the renderer and its progress is visible.

---

## Snapshot-plus-tail acceleration

Replaying a long op log from the beginning is `O(N)` in operations — the cost the rebuild-correctness invariant accepts ([derived-runtime-and-projections](./derived-runtime-and-projections.md)). `MnemeSnapshotApi` provides an accelerated path that does not weaken the invariant:

1. Export the resolved entity and fact state at a chosen asserted-time checkpoint — a snapshot of _derived_ state, marked as such.
2. On restore, load the snapshot, then replay only the **tail** operations asserted after the checkpoint.

The correctness condition is explicit: **snapshot plus tail replay produces identical resolution to a full replay.** The snapshot is an optimisation, not a new source of truth — it is checkable against a full replay exactly the way incremental projection refresh is checkable against a full rebuild _(Gupta & Mumick, Maintenance of Materialized Views, 1995; [ADR-0027](../../06-adrs/ADR-0027-projection-consistency-model.md))_. If the snapshot is missing or fails its check, the system falls back to a full replay from the op log.

The trade-off named: a snapshot trades storage (it duplicates derived state at a point in time) and a small staleness window (the tail) for a much faster cold open on a large workspace. It never becomes canonical — deleting every snapshot loses nothing, because the op log can always reproduce them.

---

## Worked example — moving a workspace between machines

A consultant exports the seed workspace after the FY26 planning session and restores it on a colleague's machine:

1. **Export.** `MnemeExportApi` streams a header, one `op` record per operation — including the `baseline-graph` operations (the twelve entities, ten relationships) and the `baseline-plan` operations (the two `PlanEvent`s and their `plan_effect` relationships) — and a footer with the BLAKE3 checksum over those records. No runtime tables are exported.
2. **Transfer.** The NDJSON package and the `objects/sha256/` directory travel together; the package is byte-identical to one exported from the same state on the original machine ([ADR-0007](../../06-adrs/ADR-0007-deterministic-package-export.md)).
3. **Import.** The colleague imports; the footer checksum verifies the package is intact, operations are applied in dependency order, and facts are derived. The runtime is rebuilt as an accepted job.
4. **Equivalence.** Resolving `Automation Orchestrator`'s `disposition` at any viewpoint on the colleague's machine yields the same fact as on the original — the import reproduced the twin, not merely copied a cache.
5. A re-import of the same package is a no-op: every `op_id` already exists.

---

## Bounds and failure modes

- **Full replay** on import is `O(N)` in operations; **snapshot-plus-tail** is `O(snapshot load + tail)`.
- A **truncated package** is caught by the footer checksum; import refuses the package rather than ingesting a partial log.
- A **missing dependency** (a referenced `dep_op_id` absent from the package) is reported; import does not silently apply an operation whose causal predecessor is missing.
- A **format-version mismatch** newer than the importer understands is rejected with a clear diagnostic, never partially interpreted.

---

## References & standards

_Normative:_

- Fowler; Young — **Event Sourcing & CQRS**. The op log as the canonical, replayable export format.

_Informative:_

- Gupta & Mumick — _Maintenance of Materialized Views_, 1995. The rebuild-equivalence condition the snapshot path is checked against.

## Related documents

| Document                                                                   | What it covers                                    |
| -------------------------------------------------------------------------- | ------------------------------------------------- |
| [ADR-0007](../../06-adrs/ADR-0007-deterministic-package-export.md)         | Deterministic package export.                     |
| [ADR-0018](../../06-adrs/ADR-0018-idempotency-and-deduplication.md)        | Idempotent ingest under retry.                    |
| [The op / fact / schema model](./op-fact-schema-model.md)                  | The operation envelope the package serialises.    |
| [Derived runtime and projections](./derived-runtime-and-projections.md)    | Why derived artefacts are rebuilt, not exported.  |
| [ACCEPTED-WORK-AND-EVENTS](../../04-contracts/ACCEPTED-WORK-AND-EVENTS.md) | The accepted-job model a large import runs under. |
