# Workspace integrity and recovery

The mechanisms that keep a canonical workspace durable: the workspace lock and what happens under concurrent open, op-segment sealing and append safety, the checksum/verify routine, orphaned-blob garbage collection, and recovery from a torn or partial write. This is the operational companion to [failure-modes](./failure-modes.md): that file is the _taxonomy_ — what each failure is and the honest-state result a user sees; this file is the _mechanism_ — how the format detects and recovers from each one. The durability rules these mechanisms realise are fixed by [ADR-0002](../../06-adrs/ADR-0002-portable-workspace-format.md).

---

## The `manifest.json` schema (format v1)

`manifest.json` is the workspace's root descriptor — the first file a reader opens and the one that decides whether the open proceeds at all. It is small, canonical, and forward-tolerant. The fields below are format version `1`; the layout itself is fixed by [ADR-0002](../../06-adrs/ADR-0002-portable-workspace-format.md).

| Field                       | Type                  | Required | Default    | Meaning                                                                                                                                                                                                                                                                                                                                                                                                                           |
| --------------------------- | --------------------- | -------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `workspace_format_version`  | integer               | yes      | —          | On-disk layout version. A reader compares it to the max it supports (below) and follows the refuse-or-degrade rule ([ADR-0002](../../06-adrs/ADR-0002-portable-workspace-format.md)).                                                                                                                                                                                                                                             |
| `metamodel_package_version` | integer               | yes      | —          | The **authored** metamodel/schema-as-data package version in force (the version the latest `UpsertMetamodelBatch` declares) — _not_ "the version compiled into `model/schema/`", since M0 has no compiler. Mirrors `SCHEMA_TOO_NEW` handling. Derived effective-schema compiler metadata (`effective_schema_compiler_version`, `effective_schema_source_digest`) is **M1 runtime/derived state**, never recorded in the manifest. |
| `workspace_id`              | string (UUID)         | yes      | —          | Stable identity of the portable container, minted once at creation; survives copy/zip/sync.                                                                                                                                                                                                                                                                                                                                       |
| `partition_id`              | string (UUID)         | yes      | —          | The workspace's sole permitted data-isolation namespace (the twin), minted once at creation as a **separate** UUID from `workspace_id`. Authoritatively declared here — see below.                                                                                                                                                                                                                                                |
| `created_at`                | string (RFC 3339 UTC) | yes      | —          | Wall-clock creation instant, informational.                                                                                                                                                                                                                                                                                                                                                                                       |
| `created_by_actor_id`       | string (UUID)         | no       | —          | The logical [actor](./identifier-generation-and-provenance.md) that created the workspace; informational provenance, never a device identifier.                                                                                                                                                                                                                                                                                   |
| `hash_algorithm`            | string                | no       | `"sha256"` | The content-address family in use under `objects/`; matches the `objects/sha256/` directory ([ADR-0003](../../06-adrs/ADR-0003-content-addressed-object-store.md)).                                                                                                                                                                                                                                                               |
| `segment_seal_max_bytes`    | integer               | no       | `8388608`  | Provisional sealing threshold by size (8 MiB). Configuration, not invariant.                                                                                                                                                                                                                                                                                                                                                      |
| `segment_seal_max_age_secs` | integer               | no       | `86400`    | Provisional sealing threshold by age (24 h). Configuration, not invariant.                                                                                                                                                                                                                                                                                                                                                        |
| `feature_flags`             | object                | no       | `{}`       | Forward-compatible capability bits an older reader may safely **ignore** if unrecognised.                                                                                                                                                                                                                                                                                                                                         |
| `required_features`         | array of string       | no       | `[]`       | Features the reader **must** support to open read-write (e.g. a future `themis-access-policy-v1`). An unrecognised entry forces refuse-or-degrade — see below.                                                                                                                                                                                                                                                                    |

Rules a reader follows:

- **Unknown top-level keys are ignored, not rejected**, so a newer minor format stays readable by an older build — the forward-tolerance ADR-0002 requires. A reader never _writes_ a structure it does not fully understand.
- **`required_features` is the must-support gate** — distinct from the ignorable `feature_flags`. A workspace that lists a feature the build does not implement (for example a Themis access-policy version, or causal-dependency handling) is **refused read-write** with a clear "requires unsupported feature" diagnostic; forensic read-only inspection of raw canonical material is permitted, but the reader must not build a model that _appears_ to honour semantics it cannot enforce. This is the single seam by which later milestones (governance, sync) prevent an M0-era build from silently misinterpreting their workspaces.
- **`workspace_id` is never regenerated.** Re-deriving it on copy would break partition identity and idempotent re-import; it is minted once and carried verbatim.
- **The manifest is written first and updated through the same temp-file-plus-rename discipline** as every other canonical file (below), so a torn manifest write never half-replaces the descriptor.
- **`manifest.json` is a whole-file canonical document** — `canonical_json_document` under [Aideon Canonical JSON v1](../../04-contracts/canonical-json.md): sorted keys, no insignificant whitespace, **no trailing newline, no BOM**. The same whole-file rule governs `model/schema/authored/**/*.json` and the schema `index.json`, so every digest that participates in the foundation-rebuild oracle is reproducible. (Op and segment-checksum records, by contrast, are JSONL — canonical value **plus one** trailing LF.)

### Workspace and device identifier formats

| Identifier     | Format                                                                             | Stability                                                                                                              |
| -------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `workspace_id` | UUID string (canonical lower-case, hyphenated)                                     | Minted once at creation; constant for the life of the workspace.                                                       |
| `device_id`    | UUID string, host-local; stored under `.aideon/runtime/`, never in canonical files | Per-install identity; used **only** in the lock file and local diagnostics, never synced and never part of provenance. |

The `device_id` is **derived runtime state**, not canonical: it identifies the machine holding the writer lock and appears only in local diagnostics. It **never** seeds provenance and never enters a canonical record — the canonical "who" is the logical [`actor_id`](./identifier-generation-and-provenance.md), and the [HLC](../../04-contracts/temporal-and-scenario/hlc-encoding.md) carries no device or node component ([ADR-0022](../../06-adrs/ADR-0022-hlc-clock-model.md)). `device_id` must never be copied, zipped, or synced. Only `workspace_id` (and the optional `created_by_actor_id`) is canonical and travels in `manifest.json`.

## Partition scope and authority

A **partition** is the canonical data-isolation namespace for the twin a workspace contains. The three identifiers are distinct, even though `workspace_id → partition_id` is one-to-one at M0:

- `workspace_id` identifies the portable folder/container;
- `partition_id` identifies the model namespace (the twin) inside it — the leading key column on every runtime table, so one twin's rows never resolve against another's;
- `scenario_id` selects an _overlay_ within that namespace; it does **not** create another partition — entities, types, and operations share the same partition namespace across scenarios.

**The manifest is authoritative for the partition; the op log is authoritative for its history.** This is a bootstrap boundary, and the op log cannot be the sole source: a freshly created workspace has no operations; the writer must know the valid partition before it can validate or append the first op; an operation cannot authorise its own partition merely by carrying an unfamiliar `partition_id`; and rebuild must create the partition registry _before_ replay starts. The precise rule:

- `manifest.json.partition_id` is the **canonical declaration** of the workspace's sole permitted partition (a singular id — not a list; multiple partitions per workspace are a deferred product + format decision, [CONTEXT](../../../CONTEXT.md)).
- Every canonical operation must carry **that exact** `partition_id`. An operation whose `partition_id` differs is rejected as foreign/corrupt/unsupported (depending on how it arrived) — distinct partition ids found in records **never** expand the workspace's partition set.
- `aideon_partitions` is a **derived projection**, initialised from the manifest and verified during replay — not a second source of truth.
- Canonical identities are partition-scoped: `(partition_id, op_id)`, `(partition_id, actor_id)`, `(partition_id, entity_id)`, `(partition_id, edge_id)`, `(partition_id, type_id)`. Random UUIDs are globally collision-resistant, but semantic ownership sits inside the partition — which matters when histories are imported or merged later.

**Creation sequence.** Mint a random `workspace_id`; mint a **separate** random `partition_id` (the two are never derived from each other, so the distinction is enforceable, not merely conceptual); write and durably commit `manifest.json`; create the canonical folder structure; append any bootstrap operations (e.g. actor declarations) under that partition; build the derived runtime and its `aideon_partitions` row.

**Copy and fork.** A filesystem copy preserves both ids — it is another physical copy of the same logical workspace and partition; ordinary copy must never silently regenerate either id. Creating an independent fork is an explicit later operation that mints a new `workspace_id` and decides whether partition and operation identities are retained or remapped. At M0 an operation set carrying another `partition_id` is not imported; cross-partition mapping and adoption belong to Pylon/Koinon.

## The `model/schema/` authority rule (authored vs effective)

Schema-as-data lives in the op log and is projected to disk; which is authoritative must be unambiguous. **The canonical op log is authoritative for metamodel history.** Both on-disk schema namespaces are derived projections, deletable and rebuildable from the operations:

- Every metamodel change enters history as an `UpsertMetamodelBatch` operation (`schema.upsert` in the ADR-0002 envelope vocabulary), ordered by asserted time like any other op — the source of truth for what the schema is at any belief. **`UpsertMetamodelBatch` carries authored, unflattened metamodel definitions, and means exactly that in every milestone** ([op-fact-schema-model](./op-fact-schema-model.md)); it never changes in M1 to mean "compiled effective schema".
- **`model/schema/authored/`** is a deterministic, portable projection of the latest/retained authored batches — the authored **source** documents (types, fields/slots, type-to-field attachments, relationship rules, the policies active in that format version, package identity/version, source metadata), written under [Aideon Canonical JSON v1](../../04-contracts/canonical-json.md) and **unflattened**. Reconstructible: delete it, replay the `UpsertMetamodelBatch` operations, get byte-identical files back. Present from **M0**.
- **`model/schema/effective/`** is the compiler-produced derived projection (flattened inheritance, merged defaults, tightened constraints, compiled validation) — introduced at **M1**, added _alongside_ `authored/`, **never overwriting** it. Absent at M0 (no compiler exists at M0).
- **`index.json`** records the deterministic file inventory.

```text
model/schema/
  authored/
    <package-id>/<version>.json        # authored-source; may instead be types.json/fields.json/
                                        # edge-rules.json/policies.json — but always authored-source, permanently
  effective/                            # M1 only — compiler output, never overwrites authored/
    <compiler-contract-version>/<type-id>.json
  index.json
```

**M0 builds only `authored/` + `index.json`.** Deleting `model/schema/` and replaying the op log rebuilds `authored/` exactly (M0) and recompiles `effective/` (M1).

**Detecting and repairing disagreement (authored).** On open the host compares the digest of `model/schema/authored/` against the authored documents implied by the latest applied `UpsertMetamodelBatch`. A mismatch means the cache is stale or was edited out of band; the op log wins, and the host **rebuilds the authored documents from the log** — _rebuilds_, not "recompiles": M0 has no compiler — and overwrites the cache. A hand-edited cache is never trusted over the operations that define the schema's history ([canonical-vs-derived](../../01-architecture/boundary/canonical-vs-derived.md)).

**Effective-schema recompilation is M1.** The schema-version-hash check (`aideon_metamodel_versions`, keyed by the introducing `op_id`) and the `mneme_store_trigger_rebuild_effective_schema` recompile are **M1** concerns that keep `effective/` current relative to the authored history. **M0 neither compiles nor semantically validates the metamodel** — see the M0/M1 split in [op-fact-schema-model](./op-fact-schema-model.md).

**Immutable package/version identity.** A `(package_id, version)` is published once. Replaying a batch with the same identity and byte-equal authored content is a replay no-op; the same identity with _different_ canonical content is a schema identity collision / workspace corruption (rejected, never silently keep the first); a changed schema is a **new version** carried by a new operation. This is integrity checking, not metamodel compilation.

## The property every mechanism serves

The op log is canonical and the runtime is derived ([canonical-vs-derived](../../01-architecture/boundary/canonical-vs-derived.md)). Every mechanism below exists to hold one line: **a failure never silently produces a wrong canonical file, and a derived failure is always recoverable by rebuild.** A torn write is detected and rolled back to the last whole operation; a corrupt blob is quarantined, not served; a stale lock is reclaimed, not honoured forever. Where loss is genuine — canonical bytes physically corrupted — it is _detected_ loss with explicit coverage, never a silently wrong read ([failure-modes](./failure-modes.md)).

---

## File locking and concurrent open

A workspace is opened for writing by **at most one process at a time** ([ADR-0002](../../06-adrs/ADR-0002-portable-workspace-format.md)). This extends the single-writer queue ([storage-trait-and-engine](./storage-trait-and-engine.md)) from an in-process guarantee to an on-disk one: the queue serialises writes _within_ a process; the lock prevents a _second_ process starting its own writer.

- **The lock is an OS advisory lock held on an open file handle.** On open-for-write the host opens (or creates) `.aideon/runtime/locks/workspace.lock`, retains the handle, and takes a **non-blocking exclusive operating-system advisory lock** on it, held for the entire writable session. The file lives under `.aideon/runtime/` because it is host-local state — never copied, zipped, or synced. The OS releases the lock automatically when the process exits, **including a crash**, so there is no PID liveness probe and no manual reclaim.
- **Acquisition is the only liveness test.** A second opener simply attempts the non-blocking acquire: **success** means no cooperating writer currently holds the lock — proceed (after tail recovery, below); **failure** means another writer holds it, or the filesystem cannot establish exclusivity — do not start a second writer. There is no "detect whether the recorded holder is alive" step; the previous wording, which read holder PID/device metadata as the liveness test, is wrong (PID reuse and stale metadata make it unsafe).
- **The lock-file contents are diagnostic only.** On successful acquisition the host writes a best-effort holder record — `{ format_version, pid, device_id, application_instance_id, acquired_at, app_version }` — used solely for a human message ("open for writing by process … on device … since …"). It may be stale or left by a previous process; the UI presents it as _last-recorded_ holder information, never verified current identity, and it is **never** used to decide liveness. The file is **not deleted on close** (the OS lock is simply released): a stable file object avoids delete-and-recreate races across platforms, and a leftover file has no locking meaning.
- **Second writer.** A process that cannot acquire the lock opens **read-only** against the canonical files — reads need no lock, since canonical files are append-only and a reader observes a consistent snapshot ([storage-trait-and-engine](./storage-trait-and-engine.md)) — or reports `WORKSPACE_LOCKED` and declines.
- **Acquisition is not recovery.** Holding the lock proves only that the prior writer no longer owns the OS lock — not that its last write completed. After acquiring, and before enabling writes, the host still verifies sealed-segment checksums, validates the loose JSONL tail, and truncates/quarantines a partial trailing record per the recovery contract (below).

**What acquisition proves — and does not.** Success proves only that no other _cooperating Aideon process using the same filesystem lock facility_ holds the lock. It does **not** prove that an external program is not editing the JSONL files, that a network filesystem implements locking correctly, or that manual/malware filesystem writes are impossible. The lock enforces the Aideon single-writer protocol; it cannot make arbitrary filesystem mutation impossible.

**Unsupported or untrusted locking — refuse read-write.** Where the filesystem's locking and atomic-write semantics are unsupported or cannot be trusted, the workspace opens **read-only**; there is **no ordinary force-write bypass** (a warning does not reduce the corruption risk — two users can each believe they are the sole writer). The host uses a conservative capability policy, not path sniffing: identify known-local vs known-remote types where the platform exposes them; treat inability to acquire or verify the lock as unsafe; maintain a tested platform/filesystem support matrix and do not claim support until lock + atomic-write behaviour is tested there (remote volumes behind local-looking paths, cloud-sync folders, virtual/container mounts all defeat naive `NFS/SMB`-from-path detection). The supported recovery for a shared drive is **copy the workspace to a supported local folder and open the copy** (then exchange changes by package import, or [Koinon](../../06-adrs/ADR-0005-sync-and-conflict-model.md) sync later) — never concurrent direct writes to the shared folder. A developer-only diagnostic override may exist behind a CLI flag with no integrity guarantee; it is not a product action and is **not in M0**.

The trade-off is named: a single writer rules out write-write conflicts on one machine by construction, at the cost of no concurrent write parallelism within a workspace. Multi-writer collaboration is a separate concern handled by merge, not by concurrent local writers ([ADR-0005](../../06-adrs/ADR-0005-sync-and-conflict-model.md)).

Because the lock lives under the disposable `.aideon/runtime/`, **deleting the runtime is only safe when no writer is open, or when the holding process is intentionally rebuilding its own derived state.** An external "delete `.aideon/runtime/` while the app is running" is unsupported; the [rebuild oracle](../../data/fixtures/rebuild/README.md) wipes the runtime **while the workspace is closed**, then reopens and acquires a freshly created lock.

---

## Segment sealing and append safety

Operations are appended to the loose segment `current.ops.jsonl`. Sealing turns a growing loose segment into an immutable one:

- **Sealing.** When the loose segment reaches a size or age threshold, or on an explicit checkpoint or export, it is fsync'd, given a trailing checksum over its records, and renamed to the next monotonic numbered name (`000001.ops.jsonl`). A new empty loose segment takes over. The thresholds are provisional configuration; the invariant is what sealing guarantees, not when it fires.
- **A sealed segment is immutable.** It is never appended to or rewritten — only superseded by the next loose segment. This is what lets an open trust every sealed segment without re-validating the whole log: only the trailing loose segment can be incomplete after a crash.
- **Append safety.** Each operation is written as one complete record (JSONL initially) and the loose segment is fsync'd as part of the commit state machine ([storage-trait-and-engine](./storage-trait-and-engine.md)). A crash mid-append can leave a partial trailing record, but never a partial _sealed_ segment and never a corrupted earlier record. Record framing lets the reader find the boundary of the last complete record.

The same temp-file-plus-rename discipline applies to blobs, but the temporary file lives in **host-local staging** — `.aideon/runtime/staging/blobs/<random>.part` — **never** under `objects/sha256/`, so that root holds only valid hash-addressed objects. Bytes stream into the `.part` file (hashing as they go), are fsync'd, then atomically renamed to the final `objects/sha256/<aa>/<bb>/<digest>` path (staging and object store must share a filesystem, or ingestion fails rather than copy-and-delete). A crash before the rename leaves a stray `.part` file in staging (collected later; never exported, synced, or referenced), never a partial object at a valid address ([content-addressed-blobs](./content-addressed-blobs.md)).

### Segment ordering and sealing thresholds

- **Ordering within a segment is append order**, which is HLC-monotonic _for a single writer_: each appended record carries an `asserted_at` HLC strictly greater than the previous record's, because the single writer mints a contiguous run of HLCs ([bitemporal-and-hlc](./bitemporal-and-hlc.md)). A reader therefore never has to sort a segment; it reads top-to-bottom. This append-order-equals-HLC-order property is an **M0 single-writer convenience, not a permanent format invariant**: once sync arrives ([ADR-0034](../../06-adrs/ADR-0034-merge-correctness-and-convergence.md)) a peer may append an _older_ remote operation after newer local ones — its `asserted_at` is retained verbatim and sealed history is **never** rewritten to preserve physical sort order. Canonical order is always physical append order; the deterministic _semantic_ order is `(asserted_at, op_id)`, applied by the resolver, not by re-sorting the log. M0-authored operations carry empty `deps`, so M0 rebuild needs no topological sort ([ADR-0038](../../06-adrs/ADR-0038-canonical-operation-record-identity-and-commit-protocol.md)).
- **Ordering across segments is the monotonic file name.** Sealed segments are named with a **fixed six-digit** zero-padded sequence: `000001.ops.jsonl`, `000002.ops.jsonl`, …; the loose segment is always `current.ops.jsonl` (exact case). Numbering begins at `000001`; `000000.ops.jsonl` is reserved and invalid; the next sealed number is the prior maximum plus one; a gap in the sequence is invalid unless a later recovery format explicitly records it; a filename of another width or case is invalid under format v1. The replay order is: every sealed segment in ascending numeric order, then the loose segment. No segment's records interleave with another's.
- **The six-digit range is a format-v1 limit, not a compaction trigger.** Reaching `999999.ops.jsonl` prevents further sealing under workspace format v1. Continuing requires a later workspace-format version with a larger sequence namespace, **or** an explicitly governed compaction mechanism where retention policy permits it (canonical compaction may be prohibited by retention requirements and is itself deferred). Silent rollover or filename-width expansion is **forbidden**. (The seal thresholds make per-segment size variable — age-triggered and explicit-checkpoint seals may be far smaller than the 8 MiB size threshold — so the range is not a fixed byte capacity.)
- **Sealing fires** when the loose segment first satisfies any of: it reaches `segment_seal_max_bytes` (default 8 MiB), its oldest record is older than `segment_seal_max_age_secs` (default 24 h), or an explicit checkpoint or export is requested. These thresholds are provisional configuration recorded in `manifest.json`; the invariant is that a sealed segment is immutable and only the loose tail can be incomplete.

### The atomic-write / fsync sequence

Every canonical write follows one ordered sequence so that a crash at any point leaves the workspace at the last whole operation:

1. **Write the record** to the open loose segment file (append for an op; a temp file for a blob or a `model/schema/` rebuild).
2. **`fsync` the file** so the bytes are durable, not merely in the page cache.
3. **For temp-file writes, `rename` to the final path** — the atomic commit point. For an op append, the append itself is the commit; the loose segment is fsync'd as part of the single-writer commit state machine ([storage-trait-and-engine](./storage-trait-and-engine.md)).
4. **`fsync` the containing directory** after a rename, so the directory entry for the new name is itself durable (otherwise a crash could lose the rename even though the file content survived).

A seal is the same sequence applied to a whole segment: append the trailing checksum, `fsync` the file, `rename` `current.ops.jsonl` → `NNNNNN.ops.jsonl`, `fsync` the directory, then open a fresh empty `current.ops.jsonl`. The rename is the single atomic instant at which the segment becomes sealed.

**The canonical append is the commit point, and the SQLite projection is downstream of it.** SQLite and the JSONL op log cannot participate in one atomic transaction, so the order is fixed: append-and-`fsync` the operation to the loose segment _first_ (step 2 above is the commit), then apply it to the SQLite projection. A projection failure after a durable append is a recoverable derived-state failure — the operation is rebuilt from the op log, never lost — and projection application is therefore idempotent and replayable ([storage-trait-and-engine](./storage-trait-and-engine.md), [ADR-0018](../../06-adrs/ADR-0018-idempotency-and-deduplication.md)). A write that reached only SQLite and not the canonical segment **did not happen** and is never acknowledged. This is the on-disk expression of the canonical-over-derived rule ([canonical-vs-derived](../../01-architecture/boundary/canonical-vs-derived.md)): the file is truth, the database is a projection of it.

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

### Checksum algorithm and coverage, precisely

| Surface               | Algorithm    | What the digest covers                                                                                                                                                                                                                                                          | Where stored                                    |
| --------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Surface               | Algorithm    | What the digest covers                                                                                                                                                                                                                                                          | Where stored                                    |
| --------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------   |
| **Blob object**       | SHA-256      | The object's raw bytes, in full. The full **64-character lower-case hex** digest _is_ the path under `objects/sha256/<aa>/<bb>/<digest>` (`<aa>` = digest chars 1–2, `<bb>` = chars 3–4, then the full 64-char digest). Upper-case, shortened, or unsharded paths are invalid.  | The path itself; no separate digest store.      |
| **Sealed op segment** | BLAKE3-256   | The concatenation of every complete JSONL record in the segment, in file order, including each record's line terminator, but excluding the checksum record itself.                                                                                                              | A trailing **segment-checksum record** on seal. |
| **Export package**    | BLAKE3-256   | All `op` records in the package (not the header or footer), in order ([export-import-replay](./export-import-replay.md)).                                                                                                                                                       | The package footer record.                      |

#### The sealed-segment checksum record

The final line of a sealed segment is a canonical-JSON record (`canonical_jsonl_record` — canonical value + one LF) with a reserved discriminator, so it can never be mistaken for an operation:

```json
{
  "algorithm": "blake3-256",
  "bytes": 84291,
  "digest": "0123…(64 lower-case hex)…cdef",
  "record_type": "segment-checksum",
  "records": 417
}
```

(Shown in canonical UTF-8 key order.) The fields, pinned for format v1:

- `record_type` — exactly `"segment-checksum"`;
- `algorithm` — exactly `"blake3-256"`;
- `digest` — exactly 64 lower-case hex characters;
- `records` — the number of operation records covered (a bounded JSON **integer**, not a decimal string — segment limits keep it small);
- `bytes` — the exact byte length of the covered region, **equal to the byte offset at which the checksum record begins**, giving the verifier an independent framing check alongside the digest (also a bounded integer).

The covered region is every complete op record above it, each including its terminating LF; the checksum record and its own LF are excluded. The record occurs **exactly once**, is the **final** complete line, has **no bytes after its LF**, is **not** an operation (excluded from operation count, replay, and HLC calculations), and is **invalid in `current.ops.jsonl`** (the loose segment is still growing, carries no checksum, and is validated by record framing instead). Re-checksumming on open recomputes BLAKE3-256 over the covered bytes and compares.

### Truncated final JSONL record

The loose segment is the only file that can end mid-record after a crash. On open, the reader scans `current.ops.jsonl` line by line and accepts each record that is a complete, well-framed JSON line terminated by a newline. The **last line is accepted only if it is whole**; a line with no terminating newline, or that fails to parse, is the truncation point. The reader:

1. Takes every complete record up to and including the last whole line as the recovered op set.
2. Truncates the file at the end of that last whole record (rewriting the loose segment to drop the partial tail), so the next append starts clean.
3. Reports the discarded partial tail as a recovered truncation, not an error — the partial bytes were never a committed operation, so no fact derived from them and nothing is lost.

A sealed segment is never subject to this rule: it has a trailing checksum and is whole by construction, so a framing failure inside a _sealed_ segment is corruption (below), not truncation.

### Sealed-segment corruption

A sealed segment whose recomputed BLAKE3 does not match its trailing checksum is **damaged canonical data** — the one case where loss may be genuine. The reader does not silently skip it and does not partially apply it. It:

1. **Refuses to open the workspace read-write** and surfaces a `Failed` coverage state naming the damaged segment file ([failure-modes](./failure-modes.md), [DOCUMENTATION-STANDARD §9](../../02-standards/DOCUMENTATION-STANDARD.md)) — never a silently-wrong read.
2. **Offers recovery from a redundant source** where one exists: re-import from an export package (footer-verified), restore the segment from a sync peer that holds the same `(partition, op_id)` operations, or roll the workspace back to the last sealed segment that verifies. Idempotent ingest makes re-supplying the lost operations safe ([ADR-0018](../../06-adrs/ADR-0018-idempotency-and-deduplication.md)).
3. **Where no redundant copy exists, reports detected loss with its exact extent** (which operations the damaged segment held), so the user knows precisely what is gone rather than discovering it as a wrong answer later.

This is the line the whole format holds: a failure is either recoverable by rebuild, recoverable from a redundant copy, or _detected and named_ — never a silently wrong canonical read.

### Maximum supported format and schema versions

A build declares the highest versions it understands, and the open path enforces them per the refuse-or-degrade rule ([ADR-0002](../../06-adrs/ADR-0002-portable-workspace-format.md)):

| Bound                           | Value (format v1 baseline) | On exceed                                                                                                                                                                                                                                                    |
| ------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `MAX_WORKSPACE_FORMAT_VERSION`  | `1`                        | A workspace declaring a higher _major_ `workspace_format_version` is refused with `WORKSPACE_FORMAT_TOO_NEW` ([ADR-0016](../../06-adrs/ADR-0016-error-envelope-rfc9457.md)); a higher backward-compatible minor opens read-only with unknown fields ignored. |
| `MAX_METAMODEL_PACKAGE_VERSION` | `1`                        | A `metamodel_package_version` newer than the build understands is refused with `SCHEMA_TOO_NEW` ([failure-modes](./failure-modes.md)); the metamodel is never partially interpreted.                                                                         |

Both bounds are forward-only: an older workspace is migrated up on open (a one-way migration), never down ([ADR-0017](../../06-adrs/ADR-0017-contract-and-dto-versioning.md)).

### Format-v1 constants (consolidated)

| Surface                 | Fixed rule                                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------------------- |
| Operation record        | Canonical JSON + one LF (`canonical_jsonl_record`)                                                            |
| Segment-checksum record | Canonical JSON + one LF; `record_type: "segment-checksum"`, `algorithm: "blake3-256"`                         |
| Whole JSON document     | Canonical JSON, **no** trailing LF, no BOM (`manifest.json`, `model/schema/authored/**/*.json`, `index.json`) |
| Segment digest          | BLAKE3-256, 64 lower-case hex                                                                                 |
| Blob digest             | SHA-256, 64 lower-case hex                                                                                    |
| Blob path               | `objects/sha256/<aa>/<bb>/<digest>` (`<aa>`=chars 1–2, `<bb>`=chars 3–4, full 64)                             |
| Sealed segment          | Six-digit sequence, starting `000001`; loose is `current.ops.jsonl`                                           |
| Blob staging            | `.aideon/runtime/staging/blobs/<random>.part` (32 hex chars; never under `objects/`)                          |
| `BlobRef.length`        | Decimal string (full-range `u64`)                                                                             |
| Missing `media_type`    | Present as `"media_type": null`                                                                               |

The byte forms (`canonical_json_bytes` / `canonical_jsonl_record` / `canonical_json_document`) are defined in [Aideon Canonical JSON v1](../../04-contracts/canonical-json.md).

---

## Orphaned-blob garbage collection

A blob object is referenced by a `BlobRef` digest in one or more operations. Reclamation is keyed to **retained canonical history, not the current resolved view**: because asserted-time history is preserved, a blob referenced only by an _older_ operation is still needed to replay a historical belief even when no current fact points at it. The M0-safe invariant is **if any retained canonical operation references the digest, retain the object** ([content-addressed-blobs](./content-addressed-blobs.md)). The model is mark-and-sweep, deferred and explicit, run off the write path:

1. **Mark.** Collect the digests referenced by every retained canonical operation.
2. **Sweep.** Only an object referenced by **no** retained canonical operation is removable — a blob durably written before an op append that then failed, an abandoned import, or an explicitly staged object never committed. M0 offers temp-file cleanup, orphan detection, and a **dry-run orphan report**; deletion is conservative and never triggered merely because the current resolved view does not reference the object. GC runs as a `trigger_retention` / batch-tier job ([derived-runtime-and-projections](./derived-runtime-and-projections.md)), never inline on a tombstone.

Two properties make GC safe against concurrent readers:

- **It runs through the single writer.** Reclaiming an object is a write, so it serialises behind the single-writer queue ([storage-trait-and-engine](./storage-trait-and-engine.md)); it never races a write that might create a new reference, because there is no concurrent write.
- **It is conservative.** When reference-liveness is uncertain, the object is retained — disk is cheaper than a dangling reference, so the failure mode is _keeping too long_, never _deleting too soon_.

**Historical reclamation** — collecting an object whose only references are in superseded history that is being retired — belongs with **governed op-log retention and compaction** and is deferred until that exists. Until then, retained-canonical-history reference is the only deletion gate.

---

## Recovery from a torn or partial write

A torn write is an interrupted commit — a crash between the first byte of a write and the durable, fsync'd completion of the commit. Because the op log is canonical and the commit path is an explicit state machine ([storage-trait-and-engine](./storage-trait-and-engine.md)), recovery is mechanical, not heuristic.

| Interruption point                              | What is on disk afterwards                                                                      | Recovery on next open                                                                                                                                     |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mid-append to the loose segment**             | A partial trailing record in `current.ops.jsonl`; all earlier records whole.                    | Read the loose segment up to the last complete record; report the truncated tail. The partial record is not yet an operation, so no fact derives from it. |
| **After append, before derived-runtime commit** | The operation is durable in the loose segment; the derived runtime is behind.                   | The runtime is derived: rebuild it from the op log; the operation is replayed and its facts re-derive.                                                    |
| **Mid blob temp-file write (before rename)**    | A stray `.part` file in `.aideon/runtime/staging/blobs/`; no object at the target hash address. | The stray staging file is collected; no partial object ever appears at a valid address ([content-addressed-blobs](./content-addressed-blobs.md)).         |
| **Mid-seal (before rename)**                    | The loose segment is intact; the sealed name does not yet exist.                                | The loose segment is still authoritative; sealing re-runs. Rename is the atomic commit point of a seal.                                                   |

The unifying rule: **a crash leaves the workspace at the last whole operation, never half-applied.** The loose segment's last complete record is the recovery point; everything after it is discarded as never-committed, and the derived runtime is rebuilt to match ([derived-runtime-and-projections](./derived-runtime-and-projections.md)). Recovery re-ingests canonical operation envelopes through the replay path, which recognises an operation by its permanent `(partition_id, op_id)` — not by the run-ledger idempotency key, which the runtime wipe may have destroyed ([export-import-replay](./export-import-replay.md)). Replay re-applies only the missing tail, never duplicating operations that already landed.

**Identity collision is not always a benign duplicate.** A re-supplied operation whose `(partition_id, op_id)` matches an existing record _with identical canonical content_ is a no-op. The same key arriving with _different_ content is **corruption**: the reader rejects it and names the workspace corrupt rather than silently keeping the first record. An `op_id` is minted once on the authoring path and is immutable thereafter; two different mutations can never share one.

---

## Worked example — recovering from a torn write during a bulk import

A power loss interrupts a bulk import of the seed workspace while it is appending operations:

1. **Crash.** The host was appending the `baseline-plan` operations (the two `PlanEvent`s and their `plan_effect` relationships) to `current.ops.jsonl`. Power is lost after the first `PlanEvent` operation is fully written and fsync'd, but mid-way through writing the second. The crashed process's lock file remains at `.aideon/runtime/locks/workspace.lock`.

2. **Reopen and acquire the lock.** On the next launch the host opens the lock file and **successfully acquires the exclusive OS lock**, proving no cooperating writer still holds it — the OS released the dead process's lock when it exited. The stale diagnostic contents are ignored for liveness. Acquiring the lock does not yet mean the last write was clean, so the host proceeds to verify the canonical tail before enabling writes.

3. **Verify the canonical roots.** Sealed segments re-checksum cleanly. The loose segment `current.ops.jsonl` fails framing validation on its trailing record: the second `PlanEvent` operation is partial. The host reads the loose segment up to the last complete record — the first `PlanEvent` operation — and reports the truncated tail. The partial record is not an operation, so no fact derives from it.

4. **Rebuild the derived runtime.** The runtime database is behind (or internally inconsistent). The host deletes `.aideon/runtime/` and rebuilds from the validated operations as an [accepted job](../../04-contracts/ACCEPTED-WORK-AND-EVENTS.md). The rebuilt twin resolves every recovered slot — `Automation Orchestrator`'s `disposition = Migrate`, the first FY26 `PlanEvent` and its `plan_effect` — to the same facts the canonical log holds.

5. **Re-ingest the accepted import batch.** Recovery **re-ingests the same canonical operation envelopes** (the accepted batch, identified by its `import_batch_id`); it does _not_ re-author through the create path. Operations already present are recognised by `(partition_id, op_id)` and become no-ops; only the missing tail — the second `PlanEvent` and its `plan_effect`, carrying their original `op_id`, asserted time, and provenance — is applied ([export-import-replay](./export-import-replay.md), [Pylon import identity](../pylon/deterministic-reviewable-import.md)). Re-authoring the same source through `insert_op` would mint new `op_id`s and duplicate history — it is a new assertion, not replay.

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
