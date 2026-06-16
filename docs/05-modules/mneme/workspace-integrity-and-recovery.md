# Workspace integrity and recovery

The mechanisms that keep a canonical workspace durable: the workspace lock and what happens under concurrent open, op-segment sealing and append safety, the checksum/verify routine, orphaned-blob garbage collection, and recovery from a torn or partial write. This is the operational companion to [failure-modes](./failure-modes.md): that file is the _taxonomy_ — what each failure is and the honest-state result a user sees; this file is the _mechanism_ — how the format detects and recovers from each one. The durability rules these mechanisms realise are fixed by [ADR-0002](../../06-adrs/ADR-0002-portable-workspace-format.md).

---

## The property every mechanism serves

The op log is canonical and the runtime is derived ([canonical-vs-derived](../../01-architecture/boundary/canonical-vs-derived.md)). Every mechanism below exists to hold one line: **a failure never silently produces a wrong canonical file, and a derived failure is always recoverable by rebuild.** A torn write is detected and rolled back to the last whole operation; a corrupt blob is quarantined, not served; a stale lock is reclaimed, not honoured forever. Where loss is genuine — canonical bytes physically corrupted — it is _detected_ loss with explicit coverage, never a silently wrong read ([failure-modes](./failure-modes.md)).

---

## File locking and concurrent open

A workspace is opened for writing by **at most one process at a time** ([ADR-0002](../../06-adrs/ADR-0002-portable-workspace-format.md)). This extends the single-writer queue ([storage-trait-and-engine](./storage-trait-and-engine.md)) from an in-process guarantee to an on-disk one: the queue serialises writes _within_ a process; the lock prevents a _second_ process starting its own writer.

- **The lock.** On open-for-write, the host takes an exclusive advisory lock at `.aideon/runtime/locks/workspace.lock`. The lock file records the holder's process and device identity. It lives under `.aideon/runtime/` because it is host-local state — never copied, zipped, or synced with the canonical files.
- **Second writer refused.** A process that finds a live lock must not start a second writer. It either opens **read-only** against the canonical files — reads need no lock, because canonical files are append-only and a reader observes a consistent snapshot ([storage-trait-and-engine](./storage-trait-and-engine.md)) — or it reports the workspace busy and declines.
- **Stale-lock reclaim.** A process that crashes leaves its lock file behind. Because the lock records holder identity, a later opener detects that the recorded holder is no longer alive and reclaims the lock, rather than treating a dead holder's lock as permanently blocking. Reclaim is safe: the canonical files were left at the last whole operation regardless of how the previous holder died (see _recovery from a torn write_ below).

The trade-off is named: a single writer rules out write-write conflicts on one machine by construction, at the cost of no concurrent write parallelism within a workspace. Multi-writer collaboration is a separate concern handled by merge, not by concurrent local writers ([ADR-0005](../../06-adrs/ADR-0005-sync-and-conflict-model.md)).

---

## Segment sealing and append safety

Operations are appended to the loose segment `current.ops.jsonl`. Sealing turns a growing loose segment into an immutable one:

- **Sealing.** When the loose segment reaches a size or age threshold, or on an explicit checkpoint or export, it is fsync'd, given a trailing checksum over its records, and renamed to the next monotonic numbered name (`000001.ops.jsonl`). A new empty loose segment takes over. The thresholds are provisional configuration; the invariant is what sealing guarantees, not when it fires.
- **A sealed segment is immutable.** It is never appended to or rewritten — only superseded by the next loose segment. This is what lets an open trust every sealed segment without re-validating the whole log: only the trailing loose segment can be incomplete after a crash.
- **Append safety.** Each operation is written as one complete record (JSONL initially) and the loose segment is fsync'd as part of the commit state machine ([storage-trait-and-engine](./storage-trait-and-engine.md)). A crash mid-append can leave a partial trailing record, but never a partial _sealed_ segment and never a corrupted earlier record. Record framing lets the reader find the boundary of the last complete record.

The same temp-file-plus-rename discipline applies to blobs: bytes are written to a temporary file, fsync'd, then renamed to the final `objects/sha256/<hash>` path, so a crash before the rename leaves a stray temp file (collected later), never a partial object at a valid address ([content-addressed-blobs](./content-addressed-blobs.md)).

---

## The verify routine

Canonical files are verifiable without a side database, because the integrity check rides on the addressing scheme rather than a separate digest store:

| Canonical file        | What is hashed                                     | Hash family                                                       | Detection                                                                                                                                      |
| --------------------- | -------------------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Blob object**       | The object's own bytes — the address _is_ the hash | SHA-256 (`objects/sha256/`)                                       | Re-hash on read or open; a mismatch means the bytes are not what the address claims ([content-addressed-blobs](./content-addressed-blobs.md)). |
| **Sealed op segment** | The segment's records                              | Trailing checksum on the sealed file                              | Re-checksum on open; a mismatch means the sealed segment was altered or damaged.                                                               |
| **Loose op segment**  | Record framing, up to the last complete record     | —                                                                 | Validate framing on open; an incomplete trailing record marks the truncation point.                                                            |
| **Export package**    | All op records                                     | BLAKE3 footer ([export-import-replay](./export-import-replay.md)) | Verify footer before ingest; a truncated or tampered package is refused, not partially ingested.                                               |

On workspace open the host validates the canonical roots: it re-checksums sealed segments, validates the loose segment's framing, and (lazily or on demand) re-hashes blobs. There is **no separate checksum to keep in sync** for blobs — the hash-address scheme makes the address the checksum, so a corruption cannot hide behind a stale digest ([content-addressed-blobs](./content-addressed-blobs.md)). A blob that fails its check is **quarantined**: reads that reference it return a `Failed` coverage state naming the missing object, rather than serving corrupted bytes ([failure-modes](./failure-modes.md), [DOCUMENTATION-STANDARD §9](../../02-standards/DOCUMENTATION-STANDARD.md)).

The hash family is versioned by directory (`objects/sha256/`), so a second algorithm can coexist if SHA-256 is ever retired ([ADR-0003](../../06-adrs/ADR-0003-content-addressed-object-store.md)).

---

## Orphaned-blob garbage collection

A blob object is referenced by hash from one or more property facts. An object becomes a candidate for reclamation only when **no live fact references it at any viewpoint retention still keeps** ([content-addressed-blobs](./content-addressed-blobs.md)). The model is mark-and-sweep, deferred and explicit, run off the write path:

1. **Mark.** Scan live (non-superseded) facts across every layer and scenario within retention, collecting the set of referenced hashes.
2. **Sweep.** An object under `objects/sha256/` whose hash is not in the referenced set, and which falls outside retention, is removable. GC runs as a `trigger_retention` / batch-tier job ([derived-runtime-and-projections](./derived-runtime-and-projections.md)), never as an inline side effect of a tombstone — tombstoning a fact does not remove its blob, because an older belief or another scenario may still reference it.

Two properties make GC safe against concurrent readers:

- **It runs through the single writer.** Reclaiming an object is a write, so it serialises behind the single-writer queue ([storage-trait-and-engine](./storage-trait-and-engine.md)); it never races a concurrent write that might create a new reference, because there is no concurrent write.
- **It is conservative.** When reference-liveness is uncertain, the object is retained. The trade-off is named: disk is cheaper than a dangling reference, so the failure mode is _keeping too long_, never _deleting too soon_. A reader holding a hash will always find its object, because GC never removes an object a live fact still references.

The exact retention policy and GC cadence are configuration ([SQLITE](./SQLITE.md), `limits` and `integrity`); the invariant is that GC only ever removes objects provably unreferenced within retention.

---

## Recovery from a torn or partial write

A torn write is an interrupted commit — a crash between the first byte of a write and the durable, fsync'd completion of the commit. Because the op log is canonical and the commit path is an explicit state machine ([storage-trait-and-engine](./storage-trait-and-engine.md)), recovery is mechanical, not heuristic.

| Interruption point                              | What is on disk afterwards                                                    | Recovery on next open                                                                                                                                     |
| ----------------------------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mid-append to the loose segment**             | A partial trailing record in `current.ops.jsonl`; all earlier records whole.  | Read the loose segment up to the last complete record; report the truncated tail. The partial record is not yet an operation, so no fact derives from it. |
| **After append, before derived-runtime commit** | The operation is durable in the loose segment; the derived runtime is behind. | The runtime is derived: rebuild it from the op log; the operation is replayed and its facts re-derive.                                                    |
| **Mid blob temp-file write (before rename)**    | A stray temp file; no object at the target hash address.                      | The stray temp file is collected; no partial object ever appears at a valid address ([content-addressed-blobs](./content-addressed-blobs.md)).            |
| **Mid-seal (before rename)**                    | The loose segment is intact; the sealed name does not yet exist.              | The loose segment is still authoritative; sealing re-runs. Rename is the atomic commit point of a seal.                                                   |

The unifying rule: **a crash leaves the workspace at the last whole operation, never half-applied.** The loose segment's last complete record is the recovery point; everything after it is discarded as never-committed, and the derived runtime is rebuilt to match ([derived-runtime-and-projections](./derived-runtime-and-projections.md)). Idempotent ingest means a re-run of the interrupted work re-applies only the missing tail, never duplicating operations that already landed ([ADR-0018](../../06-adrs/ADR-0018-idempotency-and-deduplication.md), [export-import-replay](./export-import-replay.md)).

---

## Worked example — recovering from a torn write during a bulk import

A power loss interrupts a bulk import of the seed workspace while it is appending operations:

1. **Crash.** The host was appending the `baseline-plan` operations (the two `PlanEvent`s and their `plan_effect` relationships) to `current.ops.jsonl`. Power is lost after the first `PlanEvent` operation is fully written and fsync'd, but mid-way through writing the second. The crashed process's lock file remains at `.aideon/runtime/locks/workspace.lock`.

2. **Reopen and reclaim the lock.** On the next launch, the host finds the lock file, detects the recorded holder is no longer alive, and reclaims it — the previous writer is gone, and the canonical files were left at the last whole operation regardless of how it died.

3. **Verify the canonical roots.** Sealed segments re-checksum cleanly. The loose segment `current.ops.jsonl` fails framing validation on its trailing record: the second `PlanEvent` operation is partial. The host reads the loose segment up to the last complete record — the first `PlanEvent` operation — and reports the truncated tail. The partial record is not an operation, so no fact derives from it.

4. **Rebuild the derived runtime.** The runtime database is behind (or internally inconsistent). The host deletes `.aideon/runtime/` and rebuilds from the validated operations as an [accepted job](../../04-contracts/ACCEPTED-WORK-AND-EVENTS.md). The rebuilt twin resolves every recovered slot — `Automation Orchestrator`'s `disposition = Migrate`, the first FY26 `PlanEvent` and its `plan_effect` — to the same facts the canonical log holds.

5. **Re-run the import.** The import is re-run. Idempotent ingest makes the operations that already landed before the crash no-ops; only the missing tail — the second `PlanEvent` and its `plan_effect` — is applied ([ADR-0018](../../06-adrs/ADR-0018-idempotency-and-deduplication.md)).

No user data is lost. The crash damaged only the unwritten tail and derived state; the canonical log is intact up to the last whole operation, the lock is reclaimed cleanly, and the rebuild plus re-run reproduces the twin the import intended.

---

## References & standards

_Normative:_

- Merkle, 1987; **Git internals**; IPFS — content-addressable storage. The hash-address-as-checksum property behind blob verification.
- BLAKE3 — the export-package footer checksum ([export-import-replay](./export-import-replay.md)).

_Informative:_

- RFC 9457, Problem Details — the error-envelope shape recovery diagnostics surface through ([ADR-0016](../../06-adrs/ADR-0016-error-envelope-rfc9457.md)).

## Related documents

| Document                                                                       | What it covers                                                   |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| [ADR-0002](../../06-adrs/ADR-0002-portable-workspace-format.md)                | The durability rules these mechanisms realise.                   |
| [Failure modes and recovery](./failure-modes.md)                               | The failure _taxonomy_ — this file is the matching _mechanism_.  |
| [Content-addressed blobs](./content-addressed-blobs.md)                        | Blob integrity by hash, quarantine, and the GC model.            |
| [The storage trait and engine](./storage-trait-and-engine.md)                  | The single-writer queue and the crash-safe commit state machine. |
| [Export, import, and replay](./export-import-replay.md)                        | The package footer checksum and idempotent, order-robust ingest. |
| [Derived runtime and projections](./derived-runtime-and-projections.md)        | Rebuild as the recovery path for derived state.                  |
| [Canonical vs derived](../../01-architecture/boundary/canonical-vs-derived.md) | Why a failure never reaches the canonical files.                 |
