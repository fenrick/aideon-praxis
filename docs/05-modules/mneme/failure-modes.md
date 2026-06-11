# Failure modes and recovery

How Mneme behaves when something goes wrong: what each failure is, how it is detected, the designed response, and the honest-state result a user sees. The unifying property is that a failure in any derived structure is recoverable by rebuild, and a failure never reaches the canonical files ([canonical-vs-derived](../../01-architecture/boundary/canonical-vs-derived.md)). Result states follow the honest-state vocabulary ([DOCUMENTATION-STANDARD §9](../../02-standards/DOCUMENTATION-STANDARD.md)).

---

## The unifying property

Because the op log is canonical and the runtime is derived, every failure falls into one of two classes:

- **A failure in derived state** (a corrupt index, a wrong projection, an engine that will not open) is recoverable by rebuilding from canonical files. No user data is at stake.
- **A failure in canonical state** (a truncated op segment, a tampered blob) is genuine, but it is _detected_ — surfaced with explicit coverage, never silently served as if healthy.

A failure in the host or renderer never reaches the canonical files, because only Mneme writes them, through one serialised path ([storage-trait-and-engine](./storage-trait-and-engine.md)).

---

## The failure table

| Failure                              | Trigger                                                                 | Detection                                                                                                   | Designed response                                                                                                                                                                                               | Result state                                                  |
| ------------------------------------ | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| **Truncated op segment**             | A crash mid-write leaves a partial trailing segment.                    | The segment fails validation on open; the footer or record framing is incomplete.                           | Read the op log up to the last valid operation; report the truncation. The runtime is rebuilt only from operations that validate.                                                                               | Validation error; the affected tail is surfaced, not dropped. |
| **Corrupt blob**                     | A disk fault flips bytes in an `objects/sha256/` object.                | Re-hashing the object does not match its address ([content-addressed-blobs](./content-addressed-blobs.md)). | Quarantine the object; reads that reference it return explicit coverage. Canonical, so it is genuine loss — but detected loss.                                                                                  | **Failed**, with explicit coverage.                           |
| **Saturated write queue**            | Writes arrive faster than the single writer drains.                     | The bounded queue reaches capacity.                                                                         | Return `BACKPRESSURE`; the renderer shows a queued state. A retry with the same idempotency key is safe ([ADR-0018](../../06-adrs/ADR-0018-idempotency-and-deduplication.md)).                                  | Queued / backpressure.                                        |
| **Corrupt or wrong derived runtime** | A bug or fault leaves an index or projection inconsistent.              | A consistency check, or a user-reported wrong result.                                                       | Rebuild the affected projection incrementally, or delete `.aideon/runtime/` and rebuild fully. No data loss ([derived-runtime-and-projections](./derived-runtime-and-projections.md)).                          | **Rebuilding**, then Fresh.                                   |
| **Engine init failure**              | The storage engine cannot open the runtime DB on workspace open.        | Open returns an error.                                                                                      | If the failure is in derived state, trigger a rebuild. If init still fails, fail the open cleanly with a diagnostic; canonical files stay untouched and openable by a later build.                              | **Failed**, canonical data intact.                            |
| **Schema too new**                   | A workspace carries a schema version newer than the binary understands. | The migration / version check at open.                                                                      | Reject the open with `SCHEMA_TOO_NEW` rather than partially interpreting a future schema ([SQLITE](./SQLITE.md)).                                                                                               | Error; no partial interpretation.                             |
| **Clock fault**                      | The wall clock jumps backwards beyond the HLC skew tolerance.           | `Hlc::now()` detects the out-of-tolerance step.                                                             | Emit `clock_invalid`; continue on the logical counter rather than minting an out-of-order asserted time ([bitemporal-and-hlc](./bitemporal-and-hlc.md), [ADR-0022](../../06-adrs/ADR-0022-hlc-clock-model.md)). | Warning; order preserved.                                     |
| **Job failure**                      | A background projection or analytics job errors.                        | The job exhausts retries or fails terminally.                                                               | The prior derived artefact stays in place; the result carries a freshness badge. Failures never corrupt authoritative data ([derived-runtime-and-projections](./derived-runtime-and-projections.md)).           | **Stale** / **Failed** on that artefact only.                 |

---

## Recovery is rebuild

The single most important recovery path is the runtime rebuild ([derived-runtime-and-projections](./derived-runtime-and-projections.md), worked example). Any derived corruption — a wrong index, an inconsistent projection, an engine that will not open — is resolved by deleting `.aideon/runtime/` and replaying the canonical op log. The rebuild is checked against the op log as oracle, so the recovered state is provably the state that existed before the fault, not an approximation.

The crash-safety of the write path supports this: the commit path is an explicit state machine ([storage-trait-and-engine](./storage-trait-and-engine.md)), and a crash mid-commit leaves the workspace at the last committed operation, never half-applied. A blob written via temp-file-plus-rename is either fully present at its hash address or absent, never partial ([content-addressed-blobs](./content-addressed-blobs.md)).

---

## Worked example — recovering a corrupt index after a crash

A power loss interrupts a bulk import of the seed workspace mid-write:

1. On the next open, the host validates the canonical roots. The trailing op segment is truncated; Mneme reads the op log up to the last valid operation and reports the truncated tail — the partially-written operations after it are not yet part of the log, so no fact derives from them.
2. The runtime database is internally inconsistent (a half-built index). The host does not present a half-initialised twin; it deletes `.aideon/runtime/` and rebuilds from the validated operations as an [accepted job](../../04-contracts/ACCEPTED-WORK-AND-EVENTS.md).
3. The rebuilt twin resolves every seed slot — `Automation Orchestrator`'s `disposition`, the FY26 plan events — to the same facts as before the crash, because they derive from canonical operations, not the corrupted index.
4. The import is re-run; idempotent ingest means the operations that already landed before the crash are no-ops, and only the missing tail is applied ([export-import-replay](./export-import-replay.md), [ADR-0018](../../06-adrs/ADR-0018-idempotency-and-deduplication.md)).

No user data is lost. The crash damaged only derived state and the unwritten tail; the canonical log is intact, and the rebuild reproduces the twin.

---

## References & standards

_Informative:_

- RFC 9457, Problem Details — the error-envelope shape these failures surface through ([ADR-0016](../../06-adrs/ADR-0016-error-envelope-rfc9457.md)).

## Related documents

| Document                                                                       | What it covers                                           |
| ------------------------------------------------------------------------------ | -------------------------------------------------------- |
| [Canonical vs derived](../../01-architecture/boundary/canonical-vs-derived.md) | The full failure-and-recovery scenarios at the boundary. |
| [Derived runtime and projections](./derived-runtime-and-projections.md)        | Rebuild as the recovery path.                            |
| [Content-addressed blobs](./content-addressed-blobs.md)                        | Blob integrity and quarantine.                           |
| [The storage trait and engine](./storage-trait-and-engine.md)                  | Backpressure and crash-safe commit.                      |
| [ADR-0022](../../06-adrs/ADR-0022-hlc-clock-model.md)                          | The clock-fault behaviour.                               |
