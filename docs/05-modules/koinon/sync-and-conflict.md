# Sync and conflict

How Koinon operationalises the sync and conflict model: exchanging operations not derived state, converging on the op log, and recording genuine conflicts as first-class operations. For practitioners reasoning about how peers stay consistent without a central authority.

> **PLANNED.** No `koinon` crate exists; this is design intent per [ADR-0029](../../06-adrs/ADR-0029-collaboration-and-sync-koinon.md), which operationalises [ADR-0005](../../06-adrs/ADR-0005-sync-and-conflict-model.md).

## The exchange unit is operations, not derived state

The load-bearing invariant is that **sync exchanges operations and missing blob hashes, never derived state** ([ADR-0029](../../06-adrs/ADR-0029-collaboration-and-sync-koinon.md); [ADR-0005](../../06-adrs/ADR-0005-sync-and-conflict-model.md)). Each peer advertises an inventory — workspace-format version, schema version, sealed-segment ids and hashes, the loose-segment head, and known blob hashes — transfers missing sealed segments, optionally seals and sends the loose segment, then fetches missing blobs by hash ([ADR-0029](../../06-adrs/ADR-0029-collaboration-and-sync-koinon.md)).

Runtime database files and projections are **never synced**; each side rebuilds the same derived state independently from the operations ([ADR-0001](../../06-adrs/ADR-0001-workspace-is-canonical-authority.md)). This is why a peer on an older derived-runtime engine can still converge — the exchange unit is engine-independent ([ADR-0004](../../06-adrs/ADR-0004-storage-engine-abstraction.md)). It is also why Koinon needs the op envelope to carry HLC and `parents` from day one ([ADR-0002](../../06-adrs/ADR-0002-portable-workspace-format.md); [ADR-0022](../../06-adrs/ADR-0022-hlc-clock-model.md)): without them the causal ordering the exchange relies on cannot be reconstructed.

## Convergence reasons from the op log

Convergence is a property of the op log, not of a live wire protocol ([ADR-0029](../../06-adrs/ADR-0029-collaboration-and-sync-koinon.md)). The merge is semantic and typed ([ADR-0005](../../06-adrs/ADR-0005-sync-and-conflict-model.md)):

- **Additive relations union safely**, and **identical operations are idempotent** by `opId`.
- **Temporal facts resolve deterministically within a layer** — valid-time containment, interval specificity, then a stable tie-break by asserted time and `opId` — and **combine across layers** by the viewpoint's layer policy, never a fixed precedence ([ADR-0009](../../06-adrs/ADR-0009-temporal-model-valid-interval-layer-policy-viewpoint.md)).

Where convergence is reasoned about, it cites conflict-free replicated data types (Shapiro et al., **Conflict-free Replicated Data Types**, 2011): the additive, commutative cases converge as a CRDT would, while the cases that cannot converge purely are **surfaced rather than forced** ([ADR-0029](../../06-adrs/ADR-0029-collaboration-and-sync-koinon.md)). Koinon does not claim the whole model is a CRDT; it claims the converging cases behave like one and the rest are made visible.

## Conflicts are first-class

A genuine conflict is not a crash and not a silent overwrite — it is a recorded operation. A conflict arises from ([ADR-0029](../../06-adrs/ADR-0029-collaboration-and-sync-koinon.md); [ADR-0005](../../06-adrs/ADR-0005-sync-and-conflict-model.md)):

- the same subject / slot / interval / preference-level with incompatible values;
- a delete-versus-edit race;
- a schema change that alters a slot's meaning; or
- two distinct cleartext blobs both claiming to be "the" new version.

Such a conflict is written as a **`conflict.recorded` operation** and shown on a user-visible conflict surface as `Awaiting review` ([Documentation Standard §9](../../02-standards/DOCUMENTATION-STANDARD.md)). Because it is a recorded operation, a conflict **replays, audits, and rebuilds like any operation** — it survives a crash because it was recorded, not held in memory ([ADR-0029](../../06-adrs/ADR-0029-collaboration-and-sync-koinon.md)). Resolution is an **authored Change Event that supersedes**, recorded like any other operation (see [merge UX](./merge-ux.md)); a conflict is never resolved by silent overwrite.

## The auto-merge / manual-merge boundary

Convergence sorts every concurrent edit into one of two outcomes, and the boundary between them is fixed, not heuristic — the same operation set produces the same outcome on every replica ([ADR-0034](../../06-adrs/ADR-0034-merge-correctness-and-convergence.md)). What **auto-merges silently** is the convergent class:

- **Additive operations** — a new entity, a new `realises` or `accesses` relationship, an `OrSetUpdate` adding to a set, a `CounterUpdate` ([op-fact-schema-model](../mneme/op-fact-schema-model.md)). Two peers each adding a distinct relationship union with no loss.
- **Idempotent re-delivery** — the same `opId` arriving twice is a no-op ([ADR-0018](../../06-adrs/ADR-0018-idempotency-and-deduplication.md)).
- **Orderable claims on the same slot** — two facts that the precedence chain separates by valid-time containment, interval specificity, or asserted time resolve to a single winner deterministically, and the loser is superseded, not erased — it stays visible to a belief-pinned read ([bitemporal-and-hlc](../mneme/bitemporal-and-hlc.md)). A later correction quietly outranking an earlier value is a merge, not a conflict.

What **escalates to a human** is the residual class the precedence chain cannot separate without discarding a deliberate claim ([ADR-0005](../../06-adrs/ADR-0005-sync-and-conflict-model.md); [ADR-0029](../../06-adrs/ADR-0029-collaboration-and-sync-koinon.md)):

- the same subject / slot / valid-time interval / preference-level with **incompatible values**;
- a **delete-versus-edit race** (a tombstone concurrent with an edit to the same subject);
- a **schema change that alters a slot's meaning** mid-flight; or
- two distinct cleartext **blobs both claiming to be** the replacement.

The decision rule is: **escalate only when silent resolution would lose information a human asserted on purpose.** An orderable difference is resolved because no claim is lost — the superseded value remains in history. An incompatible-values clash is escalated because picking either side silently would erase the other's deliberate assertion. The boundary is deliberately conservative: when in doubt between resolving and escalating, Koinon escalates, because a wrongly-recorded conflict costs a review step while a wrongly-merged claim is silent data loss.

## Conflict detection at scale

The detection predicate runs per slot, not per workspace, so its cost scales with the number of operations exchanged in a sync, not with workspace size. Detection is a function of the operation set alone — never of which replica ran it or in what order — so two peers with the same operations detect the same conflicts ([ADR-0034](../../06-adrs/ADR-0034-merge-correctness-and-convergence.md)); this determinism is what stops the conflict surface itself from diverging. After a merge, only the slots touched by newly-ingested operations are re-examined for the residual class, the same incremental shape as projection invalidation, which keys re-evaluation to the changed inputs ([ADR-0027](../../06-adrs/ADR-0027-projection-consistency-model.md)). A large offline divergence therefore produces detection work proportional to the divergence, and the conflict surface lists `Awaiting review` records rather than blocking the merge — convergence on the canonical op set completes regardless of how many conflicts it records.

## Worked example

Two peers each edit the seed `Application` `n:application:automation-orchestrator` while disconnected. Peer A sets `disposition = Migrate`; peer B sets `disposition = Retire` — same subject, same slot, overlapping valid-time interval, same preference level, incompatible values. On sync, the inventories exchange the two operations and their blobs. Convergence cannot pick a winner without losing a deliberate human claim, so Koinon writes a `conflict.recorded` operation and shows both sides on the conflict surface `Awaiting review`. A steward authors a superseding Change Event — say `disposition = Migrate` with rationale — which is recorded as a normal operation that supersedes the conflict. Had the two peers instead each _added_ a distinct `realises` relationship, those would union safely with no conflict.

## References & standards

_Informative:_

- Shapiro et al. — **Conflict-free Replicated Data Types**, 2011. Convergence for the additive/commutative cases.
- Lamport — _Time, Clocks, and the Ordering of Events_, 1978; Kulkarni et al. — **Hybrid Logical Clocks**, 2014. Causal ordering and the asserted-time clock.

Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                                | What it covers                                                                 |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| [Koinon README](./README.md)                                            | The module index and invariants.                                               |
| [Merge UX](./merge-ux.md)                                               | How a steward resolves a recorded conflict.                                    |
| [ADR-0034](../../06-adrs/ADR-0034-merge-correctness-and-convergence.md) | The convergence guarantee and the auto-merge / escalate boundary.              |
| [Sync protocol](./sync-protocol.md)                                     | The handshake and op-transfer that carries this exchange.                      |
| [ADR-0005](../../06-adrs/ADR-0005-sync-and-conflict-model.md)           | The sync and conflict model this file operationalises.                         |
| [ADR-0002](../../06-adrs/ADR-0002-portable-workspace-format.md)         | The op envelope (HLC, `parents`, `conflict.recorded`) the exchange depends on. |
