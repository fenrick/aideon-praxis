# Blobs and Integrity

How content-addressed storage protects workspace integrity, and what is rejected. This realises the stored-data-integrity concern of [controls-asvs.md](./controls-asvs.md) and the blob-store decision ([ADR-0003](../../06-adrs/ADR-0003-content-addressed-object-store.md)).

## Content addressing as integrity

Binary artefacts — PDFs, images, exports, imported sources — are stored once as immutable blobs addressed by their content hash under `objects/sha256/<aa>/<bb>/<full-hash>` ([ADR-0003](../../06-adrs/ADR-0003-content-addressed-object-store.md)). The address _is_ the integrity check: an object's name is the hash of its content, so content and address cannot disagree without detection.

- The fact model stores **references** to blobs (hash, MIME type, size, domain links), never the blob bytes. A `blob.attach` operation records the reference.
- Blobs are **immutable**: replacing a file writes a new blob with a new hash and keeps the old one reachable for history and rollback. A blob is never overwritten at an existing address ([CODING-STANDARDS.md §11](../CODING-STANDARDS.md#11-immutability-and-the-append-only-op-model)).
- Identical bytes **deduplicate** by hash — attaching the same content twice does not duplicate storage.

## Verification on read

Every object stored under `objects/sha256/<digest>` is verified by re-hashing its content against the stored digest **before use**. An object whose content does not match its address is rejected: it must not be read into memory or surfaced to the renderer ([ADR-0003](../../06-adrs/ADR-0003-content-addressed-object-store.md)).

This is the Tampering control at the storage layer ([threat-model.md](./threat-model.md)): a blob altered on disk — by corruption, a local attacker, or a bad sync — fails its hash check and is treated as absent, not trusted. Verification on read is mandatory, not an optional fast-path skip.

- Blobs are written via **temp-file-plus-rename** so a partial write never appears at a valid address ([crash-recovery testing](../TESTING-STRATEGY.md)).
- A re-hash mismatch is an `internal`-category error ([ADR-0016](../../06-adrs/ADR-0016-error-envelope-rfc9457.md)) with the offending address captured for diagnostics — never the content.

## Canonical vs derived integrity

The portable workspace folder (`model/ops`, `model/schema`, `objects/sha256`) is the canonical authority; the runtime database under `.aideon/runtime` is derived and rebuildable ([ADR-0001](../../06-adrs/ADR-0001-workspace-is-canonical-authority.md)). Integrity rests on the canonical material: the runtime can be deleted and rebuilt from the op log and blobs, and a rebuild that does not reproduce the prior effective graph is a defect the replay/rebuild tests catch ([TESTING-STRATEGY.md](../TESTING-STRATEGY.md)). A derived projection must never quietly become the source of truth.

File permissions on workspace directories and files are user-only (`0700`/`0600`); group and world bits are not granted. A single-writer queue serialises all workspace mutations ([ADR-0004](../../06-adrs/ADR-0004-storage-engine-abstraction.md)); concurrent writers are not permitted.

## Hash agility

The algorithm name lives in the path (`sha256`), versioned by directory, so a second algorithm can coexist without rewriting existing references — the addressing scheme is provisional in its choice of hash, stable in its shape ([ADR-0003](../../06-adrs/ADR-0003-content-addressed-object-store.md)). Per-blob encryption envelopes and garbage collection of unreferenced blobs are deferred concerns, not correctness ones.

## Worked example

A workspace attaches a source PDF: the host hashes the bytes, writes them to a temp file, fsyncs, renames to `objects/sha256/ab/cd/abcd…`, and records a `blob.attach` op referencing `abcd…`. Later, a byte in that file is flipped on disk. On the next read the host re-hashes and gets `ffee…` ≠ `abcd…`; it rejects the object, returns an `internal` error joinable to the trace ([ADR-0019](../../06-adrs/ADR-0019-observability-and-trace-context.md)), and does not surface corrupted bytes to the renderer. Reattaching the original bytes deduplicates back to `abcd…`.

## References & standards

_Normative:_

- Merkle, 1987; **Git internals**; IPFS — content-addressable storage. _(hash-addressed immutable blobs — [ADR-0003](../../06-adrs/ADR-0003-content-addressed-object-store.md))_

Recorded in the [standards register](../STANDARDS-REGISTER.md).

## Related documents

| Document                                                             | What it covers                                            |
| -------------------------------------------------------------------- | --------------------------------------------------------- |
| [ADR-0003](../../06-adrs/ADR-0003-content-addressed-object-store.md) | The address format and verification contract.             |
| [controls-asvs.md](./controls-asvs.md)                               | The ASVS stored-data-integrity control this realises.     |
| [Mneme module](../../05-modules/mneme/README.md)                     | The storage engine that owns the blob store.              |
| [Testing Strategy](../TESTING-STRATEGY.md)                           | The blob round-trip, tamper-rejection, and rebuild tests. |
