# Content-addressed blobs

How Mneme stores large binary values — by content hash, immutably, once — and what that buys: deduplication, integrity by construction, and a clear garbage-collection model. The decision is fixed by [ADR-0003](../../06-adrs/ADR-0003-content-addressed-object-store.md).

---

## Blobs are not inlined into facts

A large binary value — an imported document, an attachment, a rendered preview's source — is not stored in a fact row. It is written to `objects/sha256/<hash>` in the workspace and referenced by its hash in the property fact ([canonical-vs-derived](../../01-architecture/boundary/canonical-vs-derived.md)). A `Value::Ref(Id)`, or a `Value::Str` carrying the hash, is the stable reference; the blob store itself is addressed by content and immutable.

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

On read, a blob may be verified by re-hashing its bytes against its address. On workspace open, the host validates canonical roots; a blob whose bytes do not hash to its filename is **quarantined** rather than served — the corruption is surfaced, not silently returned ([failure-modes](./failure-modes.md), [canonical-vs-derived](../../01-architecture/boundary/canonical-vs-derived.md)). Because the blob store is canonical, a corrupt blob is genuine data loss for that object; the integrity check ensures it is _detected_ loss, with an explicit `Failed` coverage state, never a silently wrong read.

A blob is written via atomic temp-file-plus-rename through the single-writer queue ([storage-trait-and-engine](./storage-trait-and-engine.md)): the bytes are written to a temporary file, fsync'd, then renamed to their final hash-addressed path. A crash before the rename leaves a stray temporary file (collected later), never a partially-written object at a valid address.

---

## Garbage collection

Because an object can be referenced by many facts, an object is removable only when **no live fact references it** at any viewpoint that retention policy still keeps. The model is mark-and-sweep, deferred and explicit:

- A blob is **referenced** if any non-superseded fact, in any layer or scenario within retention, carries its hash.
- Garbage collection is a `trigger_retention` / batch-tier job ([derived-runtime-and-projections](./derived-runtime-and-projections.md)), never an inline side effect of a delete — tombstoning a fact does not immediately remove its blob, because an older belief or another scenario may still reference it.
- GC is conservative by design: when reference-liveness is uncertain, the object is retained. The trade-off is named — disk is cheaper than a dangling reference, so the failure mode is _keeping too long_, never _deleting too soon_.

The exact retention policy and GC cadence are configuration ([sqlite](./SQLITE.md), `limits` and `integrity`); the invariant is that GC only ever removes objects provably unreferenced within retention.

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
| [The op / fact / schema model](./op-fact-schema-model.md)                      | How a `Value::Blob` references the store by hash.       |
| [Failure modes and recovery](./failure-modes.md)                               | Quarantine on hash mismatch.                            |
| [SQLite specification](./SQLITE.md)                                            | The `max_blob_bytes` limit and retention configuration. |
