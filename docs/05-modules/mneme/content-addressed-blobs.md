# Content-addressed blobs

How Mneme stores large binary values — by content hash, immutably, once — and what that buys: deduplication, integrity by construction, and a clear garbage-collection model. The decision is fixed by [ADR-0003](../../06-adrs/ADR-0003-content-addressed-object-store.md).

---

## Blobs are not inlined into facts

A large binary value — an imported document, an attachment, a rendered preview's source — is **never** stored in a fact row, and **never** inline (no Base64 in a canonical record, regardless of size). It is written to `objects/sha256/<hash>` and referenced by a distinct, typed **`BlobRef`** value carried in an ordinary property operation ([ADR-0038](../../06-adrs/ADR-0038-canonical-operation-record-identity-and-commit-protocol.md), [canonical-vs-derived](../../01-architecture/boundary/canonical-vs-derived.md)). The canonical value tag is:

```json
{
  "blob": {
    "algorithm": "sha256",
    "digest": "12ab34cd…(full 64 lower-case hex)…",
    "length": "482193",
    "media_type": "application/pdf"
  }
}
```

`algorithm`, `digest`, `length`, and `media_type` are all **present** in the canonical form — `media_type` is **required-but-nullable** (`"media_type": null` when absent), so a blob value has one canonical byte form rather than two omission-equivalent encodings. `algorithm` is explicit (so identity is not derived from the `objects/sha256/` folder convention — the hash family is versioned); `digest` is the full 64-character lower-case hex SHA-256; **`length` is a full-range `u64` and is therefore a decimal string** (`"482193"`), like every other full-range coordinate in the [canonical-JSON profile](../../04-contracts/canonical-json.md). `media_type` (and an optional authored label) are descriptive, never trusted over the object's own bytes. A `BlobRef` is **not** a `Value::Ref` (that is an entity/model reference) and **not** a bare `Value::Str` carrying a hash — both ambiguities are retired. Raw bytes never appear in the persistable `Value` enum: a `Value::Blob(Vec<u8>)` inline variant must not exist, so binary cannot accidentally cross the canonical boundary; raw bytes live only on the host-side ingestion path (a `BlobBytes` / file-or-stream input) and are converted to a `BlobRef` before canonical serialisation.

This is content-addressable storage, the model behind Git's object store and IPFS _(Merkle, 1987; Git internals; IPFS)_: the address of an object **is** the hash of its bytes. The blob bytes under `objects/sha256/` are canonical material — they cannot be reconstructed from the op log, so they are part of the truth, not the derived runtime.

---

## What content-addressing buys

| Property                      | How it follows from hash-addressing                                                                                                                                                                                                                      |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Deduplication**             | Two facts referencing identical bytes resolve to the same hash and therefore the same single stored object. Importing the same attachment twice stores it once.                                                                                          |
| **Integrity by construction** | A blob's identity is the hash of its bytes. Reading it back and re-hashing detects any corruption or tampering: a mismatch means the object is not what its address claims. There is no separate checksum to keep in sync — the address is the checksum. |
| **Immutability**              | An object is never modified in place; a changed value is a new object under a new hash, and the old object remains addressable. This is what makes a blob reference a stable, replayable part of an operation.                                           |
| **Portability**               | The folder is the unit of copy and sync; a blob travels with the workspace, referenced the same way on any machine.                                                                                                                                      |

---

## Integrity checking and quarantine

On read the host **re-hashes the bytes and verifies the byte length** against the `BlobRef` before serving; `media_type` is treated as _declared_ metadata, never trusted over the object itself (the digest and length identify the bytes, the rest is descriptive). A blob whose bytes do not hash to its address is **quarantined** rather than served — the corruption is surfaced, not silently returned ([failure-modes](./failure-modes.md), [canonical-vs-derived](../../01-architecture/boundary/canonical-vs-derived.md)). Because the blob store is canonical, a corrupt or missing blob is genuine loss for that object: the affected result shows `Failed`/partial coverage and the referencing operation **remains valid canonical history** — it is never silently dropped, and read-write open may be restricted by the integrity policy.

**The object is committed before the operation that references it.** Temporary bytes are **never** written under `objects/sha256/` — that root holds only valid, immutable, hash-addressed objects and their shard directories, so package export, sync, GC, and integrity scans can assume every file below it has a hash-derived address. Staging is **host-local derived state** at `.aideon/runtime/staging/blobs/<random>.part` (a `.part` file named from 128 random bits as 32 lower-case hex chars — random because the digest is not known until the stream completes). The durable sequence (extending the [canonical write path](../../06-adrs/ADR-0038-canonical-operation-record-identity-and-commit-protocol.md)):

1. create the staging file with **exclusive-create** semantics (guards against collision and symlink substitution);
2. stream the bytes in, computing SHA-256 and length as it streams;
3. `fsync` the staging file;
4. create the final `objects/sha256/<aa>/<bb>/` shard directories if absent;
5. **atomically `rename`** the staging file to the final hash path — staging and object store **must be on the same filesystem**; if an atomic rename cannot be guaranteed, blob ingestion **fails** rather than falling back to copy-and-delete;
6. `fsync` the destination shard directory (and the staging directory after the name is removed, where the platform needs it);
7. construct the `BlobRef`; **then** append-and-commit the canonical operation carrying it; then apply to SQLite.

A committed operation therefore never points to bytes that were not already durably committed. Crash outcomes follow cleanly: a crash _before_ the rename leaves a stray `.part` file under `.aideon/runtime/staging/blobs/` (deleted on recovery, never exported, synced, or referenced from an operation — and never a partial object at a valid address); _after_ the rename but before the op append leaves an **unreferenced valid object** — a safe orphan candidate, not corruption; _after_ the op append leaves both components present, so rebuild projects normally. If the final hash path already exists, the writer verifies length and hash and reuses it (identical bytes deduplicate by hash) or quarantines a mismatch.

---

## Garbage collection

Reclamation is keyed to **retained canonical history, not to the current resolved view.** Because Aideon preserves asserted-time history, a blob referenced only by an _older_ operation is still required to replay a historical belief even when no current snapshot points to it — so "no live fact references it" is the **wrong** test. The M0-safe invariant is:

> If any **retained canonical operation** references the digest, retain the object.

What M0 reclaims is therefore limited to objects **never referenced by any canonical operation** — a blob durably written before an op append that then failed, an abandoned import, an explicitly staged object never committed. M0 implements temp-file cleanup, orphan detection, a **dry-run orphan report**, and conservative deletion of those never-referenced objects; it never deletes a blob merely because the current resolved view does not reference it. GC runs as a `trigger_retention` / batch-tier job ([derived-runtime-and-projections](./derived-runtime-and-projections.md)), off the write path, conservative by design (disk is cheaper than a dangling reference; the failure mode is _keeping too long_, never _deleting too soon_).

**Historical reclamation** — collecting a blob whose only references are in superseded history you no longer wish to retain — belongs with **governed op-log retention and compaction** and is deferred until that exists ([export-import-replay](./export-import-replay.md), [ADR-0036](../../06-adrs/ADR-0036-right-to-erasure-vs-append-only.md) for the erasure path). Until then, retained-canonical-history reference is the only deletion gate.

---

## Worked example — deduplicated import with a tampered object

An import attaches the same 2 MB reference architecture PDF to two seed applications, `Insight Hub` and `Journey Studio`:

1. The first attach writes the PDF to `objects/sha256/9f2c…` and sets a property fact on `Insight Hub` referencing `9f2c…`.
2. The second attach hashes identical bytes, finds `9f2c…` already present, and writes **no new object** — it sets a property fact on `Journey Studio` referencing the same `9f2c…`. One object, two references; deduplication is automatic.
3. Later, a disk fault flips a byte in `objects/sha256/9f2c…`. On the next open, the host re-hashes the object, finds it no longer hashes to `9f2c…`, and quarantines it. Both applications' attachment reads return a `Failed` coverage state naming the missing object, rather than serving corrupted bytes.
4. Tombstoning `Insight Hub`'s attachment fact does not remove the object — `Journey Studio` still references it. Only when both references are superseded and fall out of retention does the GC sweep remove `9f2c…`.

---

## Bounds

- **Lookup and dedup** are `O(1)` by hash — the address is the index.
- **A blob's maximum inline size** is bounded by `max_blob_bytes` ([sqlite](./SQLITE.md)); anything larger must use the object store rather than an inline value.
- **GC cost** is `O(references scanned)` per sweep, run as a batch job off the write path.

---

## References & standards

_Normative:_

- Merkle, 1987; **Git internals**; IPFS — content-addressable storage. Hash-addressed immutable blobs; deduplication; integrity by hash.

## Related documents

| Document                                                                       | What it covers                                          |
| ------------------------------------------------------------------------------ | ------------------------------------------------------- |
| [ADR-0003](../../06-adrs/ADR-0003-content-addressed-object-store.md)           | The content-addressed object-store decision.            |
| [Canonical vs derived](../../01-architecture/boundary/canonical-vs-derived.md) | Why blob bytes are canonical, not derived.              |
| [The op / fact / schema model](./op-fact-schema-model.md)                      | How a `BlobRef` value references the store by hash.     |
| [Failure modes and recovery](./failure-modes.md)                               | Quarantine on hash mismatch.                            |
| [SQLite specification](./SQLITE.md)                                            | The `max_blob_bytes` limit and retention configuration. |
