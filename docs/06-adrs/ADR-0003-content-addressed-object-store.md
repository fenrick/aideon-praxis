# ADR-0003: Content-Addressed Object Store for Binaries

- Status: Accepted
- Date: 2026-06-10
- Depends-On: ADR-0001, ADR-0002

## Context

Aideon attaches binary artefacts (PDFs, images, exports, imported sources). These must not
live in the operation/fact log or in the runtime key-value engine: large values are costly
to compact in LSM stores, and binary bodies do not merge with line-based diffs. The
appropriate pattern is a content-addressed object store — the same model used by Git's
object database and large-file tooling — where blobs are immutable, addressed by hash, and
the fact model holds references rather than bytes.

This design makes deduplication, sync, and conflict handling for binaries tractable without
any of them needing to understand binary internals.

## Governance Framing

- **Decision type:** Invariant (blobs are content-addressed and immutable) + stable seam
  (the `objects/sha256/...` path and the fact-references-blob model).
- **Known future pressure:** dedup, sync of missing blobs by hash, optional encryption,
  large workspaces.
- **What stays stable:** blobs are immutable and addressed by content hash; facts hold
  references, not bytes; replacing a file produces a new blob and keeps the old one.
- **What is provisional:** the hash algorithm name in the path (`sha256`) — versioned by
  directory so a second algorithm can coexist.
- **What is deferred:** per-blob encryption envelopes; packing/garbage-collection of
  unreferenced blobs.
- **Why hard to reverse:** references throughout the fact model point at hashes; changing
  the addressing scheme rewrites every reference.

## Decision

- Binary artefacts are stored once as **immutable blobs addressed by content hash** under
  `objects/sha256/<aa>/<bb>/<full-hash>`.
- The fact model stores **references** to blobs (hash, MIME type, size, and any domain
  links), never the blob bytes. A `blob.attach` op records the reference.
- **Replacing a file creates a new blob** with a new hash; the old blob remains reachable
  for history, rollback, and reconciliation.
- **Attaching the same bytes twice deduplicates** by hash.
- Blobs are written via temp-file-plus-rename and verified against their hash on read.

## Consequences

- Sync exchanges missing blob hashes, not database pages
  ([ADR-0005](./ADR-0005-sync-and-conflict-model.md)).
- History, rollback, and conflict handling for binaries become tractable: two different
  cleartext blobs claiming to be "the" new version is a recordable conflict, not a silent
  overwrite.
- Workspace size grows with retained history; garbage collection of unreferenced blobs is a
  deferred concern, not a correctness one.
- Preview and thumbnail derivation is a derived sidecar, not canonical storage.
