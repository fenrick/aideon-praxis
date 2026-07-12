# Offline editing and reconnection

How a peer edits while disconnected and reconciles on reconnect, and how presence signals when peers are or are not
connected. For practitioners reasoning about the local-first lifecycle: edit offline, sync on return, converge without
loss.

> **PLANNED.** No `koinon` crate exists; this is design intent per
> [ADR-0029](../../06-adrs/ADR-0029-collaboration-and-sync-koinon.md). The presence model is **provisional**
> ([ADR-0029](../../06-adrs/ADR-0029-collaboration-and-sync-koinon.md)).

## Offline editing is the normal case, not a degraded one

Aideon is local-first: a peer's workspace is fully authoritative on its own machine, and editing offline is the ordinary
mode, not a fallback ([ADR-0001](../../06-adrs/ADR-0001-workspace-is-canonical-authority.md)). An offline edit is an
operation appended to the local op log exactly as an online edit is — there is no separate "offline queue" with
different semantics. The operation is canonical the moment it lands locally; it simply has not yet been seen by other
peers. Nothing about being disconnected weakens the edit: it has an HLC asserted time, causal `deps`, and a stable
`op_id` ([op-fact-schema-model](../mneme/op-fact-schema-model.md)), so it carries everything reconciliation needs.

A peer can therefore diverge arbitrarily far while offline — many edits, a whole planning session — and remain entirely
correct on its own twin. Divergence is not a problem to be minimised; it is the state the merge is designed to
reconcile.

## Reconciliation on reconnect

Reconnection runs the [sync protocol](./sync-protocol.md): the peer advertises its inventory, diffs it against the peer
it has reconnected to, and the two transfer the operations and blobs each lacks. Reconciliation is then the merge
([ADR-0034](../../06-adrs/ADR-0034-merge-correctness-and-convergence.md)):

- The merged op set is the **union** of both peers' operations — order-independent, so the length of the offline gap
  does not matter.
- Ingestion is **idempotent and order-robust** — operations the reconnecting peer already had dedupe by `op_id`, and
  operations arrive resolved by asserted time, not by the order the offline edits happened to sync in
  ([export-import-replay](../mneme/export-import-replay.md);
  [ADR-0018](../../06-adrs/ADR-0018-idempotency-and-deduplication.md)).
- Most concurrent edits made during the gap **auto-merge** — additive relations union, orderable claims resolve by the
  precedence chain ([sync and conflict](./sync-and-conflict.md)).
- The residual class that cannot converge without losing a deliberate claim is **recorded as a `conflict.recorded`
  operation** and shown `Awaiting review`, deterministically the same on both peers
  ([sync and conflict](./sync-and-conflict.md)).

After reconciliation both peers hold the same operation set and resolve every viewpoint identically; each rebuilds its
own derived runtime locally. A long offline gap produces a larger transfer and more detection work, but no special path
— it is the same protocol and the same merge as a one-edit sync.

## Presence signals connection, not truth

Presence — who is connected, what they are viewing, cursor and selection — is an ephemeral session signal Koinon
broadcasts, never written to the op log ([presence and the shared workspace](./presence-and-shared-workspace.md);
[ADR-0029](../../06-adrs/ADR-0029-collaboration-and-sync-koinon.md)). This is exactly what makes presence the right
surface for connection state:

- While a peer is **connected**, its presence is broadcast — collaborators see it is online and where it is working.
- When a peer **goes offline**, its presence vanishes from other peers' views, because presence is a live signal with no
  durable backing. The clean consequence is that **a dropped peer loses presence, not data**: its operations are already
  canonical locally and will sync on reconnection, while its cursor and "currently viewing" state simply disappear.
- On **reconnection**, presence reappears as the session re-establishes, independently of the op exchange — presence
  describes the live session, the op exchange reconciles the twin.

Because presence is derived and disposable, it can signal connectivity honestly without ever risking the
canonical/derived boundary: a peer being absent from the presence view says nothing about whether its edits exist, only
that its session is not live. The open boundary question — whether presence lives in Koinon or the Host event bus — does
not change this invariant ([presence and the shared workspace](./presence-and-shared-workspace.md)).

## Worked example

Two architects share the seed workspace.

1. **Offline.** Architect B takes a flight and works offline. B sets `n:application:automation-orchestrator`'s
   `disposition` to `Migrate` and adds a `realises` relationship from `n:capability:customer-insight`. Both are
   operations appended to B's local op log, canonical immediately. Meanwhile A, still online elsewhere, adds an
   unrelated `accesses` relationship. To A, B's presence has vanished — A sees B is offline, but A's twin is unaffected.
2. **Reconnect.** B lands and reconnects. The sync protocol exchanges inventories; B pulls A's new `accesses` operation,
   A pulls B's two operations.
3. **Reconcile.** The three new operations are mutually additive — two new relationships and a property on a slot
   neither A's edit nor any concurrent edit touched — so they union with no conflict. Both replicas now resolve every
   viewpoint identically.
4. **Presence returns.** B's presence reappears in A's view as the session re-establishes; A sees B's cursor again. Had
   B and A both set `disposition` to incompatible values during the gap, reconciliation would instead record a
   `conflict.recorded` operation shown `Awaiting review` on both sides, for a steward to resolve by an authored
   superseding Change Event ([merge UX](./merge-ux.md)).

The data was never at risk during the offline period — only the presence signal was absent.

## References & standards

_Informative:_

- Shapiro et al. — **Conflict-free Replicated Data Types**, 2011. The order-independent merge that makes an arbitrary
  offline gap safe to reconcile.
- Kleppmann — _Designing Data-Intensive Applications_, 2017. Derived-data discipline and the log-structured
  reconciliation offline editing relies on.

Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                                | What it covers                                                       |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------- |
| [Koinon README](./README.md)                                            | The module index and invariants.                                     |
| [Sync protocol](./sync-protocol.md)                                     | The handshake and transfer reconnection runs.                        |
| [Sync and conflict](./sync-and-conflict.md)                             | The auto-merge / escalate boundary reconciliation applies.           |
| [Presence and the shared workspace](./presence-and-shared-workspace.md) | Why presence is derived, ephemeral, and the right connection signal. |
| [ADR-0034](../../06-adrs/ADR-0034-merge-correctness-and-convergence.md) | The convergence guarantee reconciliation relies on.                  |
