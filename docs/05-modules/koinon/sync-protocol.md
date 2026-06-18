# Sync protocol

How two peers discover what each other lacks and transfer the missing operations and blobs: the inventory handshake, the segment and blob exchange, and idempotent ingestion. For practitioners reasoning about the mechanics of a single sync between two replicas.

> **PLANNED.** No `koinon` crate exists; this is design intent per [ADR-0029](../../06-adrs/ADR-0029-collaboration-and-sync-koinon.md), operationalising [ADR-0005](../../06-adrs/ADR-0005-sync-and-conflict-model.md). The inventory/handshake message format is provisional ([ADR-0005](../../06-adrs/ADR-0005-sync-and-conflict-model.md)).

## The protocol carries the merge, it does not perform it

The merge is a property of the op log, not of the wire ([sync and conflict](./sync-and-conflict.md); [ADR-0034](../../06-adrs/ADR-0034-merge-correctness-and-convergence.md)). The protocol's only job is to make each peer's operation set the union of both — to **transfer the operations and blobs the other lacks** — after which each replica ingests and resolves independently. Because merge is set union, the protocol does not need to be reliable in the strong sense: a sync that transfers only some of the missing operations leaves both peers correct on what they did exchange, and a later sync completes the union. The exchange unit is operations and missing blob hashes, never derived state ([ADR-0029](../../06-adrs/ADR-0029-collaboration-and-sync-koinon.md)).

## The inventory handshake

Each peer advertises an **inventory** describing what it holds, without sending the operations themselves ([ADR-0005](../../06-adrs/ADR-0005-sync-and-conflict-model.md); Koinon `advertise` seam, [README](./README.md)):

- the **workspace-format version** and **schema version** — to refuse a sync against an incompatible format rather than ingest operations it cannot interpret;
- the **sealed-segment ids and hashes** — the op log is stored as immutable sealed segments plus one mutable loose segment ([ADR-0002](../../06-adrs/ADR-0002-portable-workspace-format.md)), so a sealed segment is identified and integrity-checked by its hash;
- the **loose-segment head** — the position of the still-growing tail; and
- **known blob hashes** — the content addresses in the peer's `objects/sha256/` store ([content-addressed-blobs](../mneme/content-addressed-blobs.md)).

Comparing two inventories is set difference. A peer learns which sealed segments it lacks (the other's segment ids minus its own), whether the other's loose head is ahead of what it has seen, and which blob hashes it is missing. This is the same discovery shape as a content-addressed transfer: identity is by hash, so "what do you have that I lack" is answered by comparing hash sets, not by replaying a log.

## Segment and blob transfer

Given the inventory diff, the transfer proceeds ([ADR-0005](../../06-adrs/ADR-0005-sync-and-conflict-model.md); [ADR-0029](../../06-adrs/ADR-0029-collaboration-and-sync-koinon.md)):

1. **Missing sealed segments** transfer whole. A sealed segment is immutable and hash-identified, so a transferred segment is verified against its advertised hash on arrival — a truncated or tampered segment is detected, not ingested ([export-import-replay](../mneme/export-import-replay.md) footer checksum).
2. **The loose segment** is optionally sealed and sent, so a peer can share its uncommitted tail without waiting for a natural seal.
3. **Missing blobs** are fetched by hash. Because blobs are content-addressed, a blob is requested only if its hash is absent locally, and a fetched blob is verified by re-hashing — the same integrity property a local blob has ([content-addressed-blobs](../mneme/content-addressed-blobs.md)).

The transfer is direction-symmetric: each peer pulls what it lacks, so a sync between A and B leaves both holding the union. Only operations and blobs cross the wire; runtime database files and projections never do ([ADR-0001](../../06-adrs/ADR-0001-workspace-is-canonical-authority.md)), which is why a peer on an older derived-runtime engine can still sync ([ADR-0004](../../06-adrs/ADR-0004-storage-engine-abstraction.md)).

## Idempotent ingestion

Once operations arrive, ingestion is the **same path as import** ([export-import-replay](../mneme/export-import-replay.md)) — sync is import from a peer rather than from a file:

- **Idempotent** — an operation already present is a no-op by `(partition, op_id)` ([op-fact-schema-model](../mneme/op-fact-schema-model.md); [ADR-0018](../../06-adrs/ADR-0018-idempotency-and-deduplication.md)). Re-running a sync, or syncing an overlapping segment twice, never duplicates an operation.
- **Order-robust** — operations carry causal `deps` and an asserted time, so ingestion applies them in a dependency-respecting order and resolves by asserted time, not arrival order ([export-import-replay](../mneme/export-import-replay.md)). A sync that delivers operations out of order, or in pieces across several syncs, converges to the same twin.

These two properties are what make a partial or repeated sync safe: idempotency removes the cost of re-sending, and order-robustness removes the need for an ordered channel. A missing dependency (a referenced `dep_op_id` absent from what was transferred) is reported, not silently applied — the next sync that carries the predecessor completes it. After ingestion, the derived runtime is rebuilt locally as an [accepted job](../../04-contracts/ACCEPTED-WORK-AND-EVENTS.md), and any residual conflict is recorded ([sync and conflict](./sync-and-conflict.md)).

## Worked example

Peer A and peer B both hold the seed workspace's `baseline-graph` and `baseline-plan` segments. While disconnected, A appends operations adding a `realises` relationship from `n:capability:customer-insight` (in A's loose segment); B appends a `SetProperty` on `n:application:automation-orchestrator`'s `disposition` (in B's loose segment).

1. **Handshake.** A and B exchange inventories. Both share the two baseline sealed segments (same ids and hashes — no transfer needed). A's loose head carries an operation B lacks; B's loose head carries one A lacks.
2. **Transfer.** A seals and sends its loose segment to B; B seals and sends its loose segment to A. No blobs differ, so no `objects/sha256/` fetch is needed. Each transferred segment is verified against its advertised hash.
3. **Ingestion.** Each peer ingests the other's operations idempotently — the shared baseline operations, had they been re-sent, would dedupe by `op_id`. The new `realises` relationship and the new `disposition` fact are both additive against the other's edits and union without conflict.
4. **Convergence.** Both replicas now hold the same operation set and resolve every viewpoint identically ([ADR-0034](../../06-adrs/ADR-0034-merge-correctness-and-convergence.md)); each rebuilds its own runtime. A re-sync moments later is a no-op: the inventories now match, so the inventory diff is empty.

## References & standards

_Informative:_

- Fowler; Young — **Event Sourcing & CQRS**. The op log as the replayable transfer unit; sync is import from a peer.
- Shapiro et al. — **Conflict-free Replicated Data Types**, 2011. The set-union merge the transfer realises.

Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                            | What it covers                                                     |
| ------------------------------------------------------------------- | ------------------------------------------------------------------ |
| [Koinon README](./README.md)                                        | The module index, invariants, and the `advertise`/`exchange` seam. |
| [Sync and conflict](./sync-and-conflict.md)                         | The merge this protocol carries and the conflict boundary.         |
| [Transport variants](./transport-variants.md)                       | The transports this same protocol runs over.                       |
| [Mneme: export, import, replay](../mneme/export-import-replay.md)   | The idempotent, order-robust ingestion path sync reuses.           |
| [ADR-0018](../../06-adrs/ADR-0018-idempotency-and-deduplication.md) | Idempotent ingestion under retry and replay.                       |
| [ADR-0002](../../06-adrs/ADR-0002-portable-workspace-format.md)     | The sealed/loose segment structure the inventory describes.        |
