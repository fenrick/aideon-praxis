# Koinon — collaboration and sync

Koinon is the planned collaboration engine of the Aideon twin: multi-user and multi-device sync, presence, the shared
workspace, and the merge/conflict experience. Koinon owns and operationalises the sync and conflict model of
[ADR-0005](../../06-adrs/ADR-0005-sync-and-conflict-model.md).

> **Implementation status: PLANNED.** No `koinon` crate exists. Everything in this folder is **design intent** — framed
> in the present tense as the standard requires, but describing behaviour not yet in code. The boundary, the
> operations-not-derived-state exchange invariant, and the conflicts-are-first-class rule are normative now and
> constrain the implementation when it lands. The governing decisions are
> [ADR-0029](../../06-adrs/ADR-0029-collaboration-and-sync-koinon.md) and
> [ADR-0005](../../06-adrs/ADR-0005-sync-and-conflict-model.md).

This README is the index and the cross-cutting narrative; each focused topic lives in its own file, per the
[Documentation Standard §4](../../02-standards/DOCUMENTATION-STANDARD.md) granularity rule.

---

## Contents

1. [Sync and conflict](./sync-and-conflict.md) — the operations-only exchange, convergence, and first-class conflicts.
2. [Presence and the shared workspace](./presence-and-shared-workspace.md) — ephemeral session signals, derived not
   canonical.
3. [Merge UX](./merge-ux.md) — how a steward resolves a recorded conflict.
4. [Sync protocol](./sync-protocol.md) — the inventory handshake, segment/blob transfer by hash, and idempotent
   order-robust ingestion.
5. [Transport variants](./transport-variants.md) — the shared-filesystem, cloud-relay, and peer-to-peer transports the
   one protocol runs over.
6. [Offline and reconnection](./offline-and-reconnection.md) — offline editing as the normal mode and reconciliation on
   reconnect.

---

## One-line role

Koinon lets peers converge on the same twin without a central authority and without silent overwrites, by exchanging
canonical operations and missing blob hashes, recording genuine conflicts as first-class operations, and broadcasting
ephemeral presence that never becomes truth.

## The boundary it occupies

Koinon occupies the **collaboration** boundary: the inventory/handshake exchange between peers and the conflict surface.
A decision with no owning module is a decision no engine is accountable for; Koinon gives the already-decided sync and
conflict model ([ADR-0005](../../06-adrs/ADR-0005-sync-and-conflict-model.md)) an accountable home so presence, the
shared workspace, and the merge experience do not accrete across Host and Mneme with no recorded boundary
([ADR-0029](../../06-adrs/ADR-0029-collaboration-and-sync-koinon.md)).

## Invariants

- **Sync exchanges operations and missing blob hashes, never derived state.** Peers transfer the canonical mutation log
  and blobs by hash; runtime database files and projections are never synced — each peer rebuilds derived state locally
  ([ADR-0029](../../06-adrs/ADR-0029-collaboration-and-sync-koinon.md);
  [ADR-0001](../../06-adrs/ADR-0001-workspace-is-canonical-authority.md)).
- **Convergence is a property of the op log.** Additive relations union safely; identical operations are idempotent by
  `opId`; temporal facts resolve deterministically and combine across layers by the viewpoint's layer policy
  ([ADR-0009](../../06-adrs/ADR-0009-temporal-model-valid-interval-layer-policy-viewpoint.md)). The converging cases
  reason as a CRDT would (Shapiro et al., Conflict-free Replicated Data Types, 2011); cases that cannot converge purely
  are surfaced, not forced.
- **Conflicts are first-class records.** A genuine conflict is written as a `conflict.recorded` operation and shown
  `Awaiting review` ([Documentation Standard §9](../../02-standards/DOCUMENTATION-STANDARD.md)); resolution is an
  authored Change Event that supersedes, never a silent overwrite
  ([ADR-0029](../../06-adrs/ADR-0029-collaboration-and-sync-koinon.md);
  [ADR-0005](../../06-adrs/ADR-0005-sync-and-conflict-model.md)).
- **Presence is derived, not canonical.** Who is connected, what they view, and cursor state are ephemeral signals
  Koinon broadcasts; they are never written to the op log and never define truth. A peer that drops loses presence, not
  data ([ADR-0029](../../06-adrs/ADR-0029-collaboration-and-sync-koinon.md)).

## What it owns / what it does not own

**Owns:** the inventory/handshake exchange; the synchronisation of operations and missing blobs; the conflict surface
and the presentation of `conflict.recorded` operations; the presence model and the shared-workspace session signals; the
merge/conflict-resolution UX.

**Does not own:** the op log and the op envelope (Mneme; the envelope's HLC and `parents` come from
[ADR-0002](../../06-adrs/ADR-0002-portable-workspace-format.md)); meaning and the metamodel (Praxis); viewpoint
resolution (Chrona); durable jobs (Continuum); the trust boundary and transport (Host); which peer may sync (Themis
identity, [ADR-0030](../../06-adrs/ADR-0030-governance-themis.md)). Koinon writes only through Mneme and owns no
canonical truth.

## Public trait seam (design intent)

Koinon is reached only through the host, which mediates the transport across the trust boundary
([ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)). The planned seam advertises an inventory,
exchanges operations and blobs, and exposes the conflict surface:

```rust
// design intent — not yet a crate
pub trait Koinon {
    fn advertise(&self) -> Result<Inventory, ProblemDetails>; // format/schema version, segment ids+hashes, loose head, blob hashes
    fn exchange(&self, peer: &Inventory) -> Result<SyncOutcome, ProblemDetails>; // transfer missing segments + blobs
    fn conflicts(&self, viewpoint: &Viewpoint) -> Result<Vec<ConflictRecord>, ProblemDetails>;
}
```

The inventory/handshake message schema is provisional ([ADR-0005](../../06-adrs/ADR-0005-sync-and-conflict-model.md))
and recorded in [ACCEPTED-WORK-AND-EVENTS.md](../../04-contracts/ACCEPTED-WORK-AND-EVENTS.md). Errors follow RFC 9457
([ADR-0016](../../06-adrs/ADR-0016-error-envelope-rfc9457.md)). The shapes are provisional until a crate exists.

## Integration with other modules (via the host)

Koinon is an engine and **depends on no other engine**
([ADR-0011](../../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md)). The host composes it:

- **Mneme** — the op log Koinon exchanges and writes `conflict.recorded` operations to; the op envelope carries HLC and
  `parents` ([ADR-0002](../../06-adrs/ADR-0002-portable-workspace-format.md),
  [ADR-0022](../../06-adrs/ADR-0022-hlc-clock-model.md)).
- **Chrona** — the layer policy and resolution that make converged facts deterministic.
- **Host** — mediates the transport; a remote peer is untrusted input until its operations validate against the
  metamodel ([ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)).
- **Themis** (planned) — gates which peer may sync ([ADR-0030](../../06-adrs/ADR-0030-governance-themis.md)).

The planned crate name is `aideon_koinon`.

## References & standards

_Informative:_

- Shapiro et al. — **Conflict-free Replicated Data Types**, 2011. Convergence properties for the additive/commutative
  cases.
- Lamport — _Time, Clocks, and the Ordering of Events_, 1978; Kulkarni et al. — **Hybrid Logical Clocks**, 2014. Causal
  ordering and the asserted-time clock underneath the exchange.

Full bibliography: [STANDARDS-REGISTER.md](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                                      | What it covers                                                                 |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| [ADR-0029](../../06-adrs/ADR-0029-collaboration-and-sync-koinon.md)           | The decision that introduces Koinon and gives the sync model an owner.         |
| [ADR-0005](../../06-adrs/ADR-0005-sync-and-conflict-model.md)                 | The sync and conflict model Koinon owns and operationalises.                   |
| [ADR-0002](../../06-adrs/ADR-0002-portable-workspace-format.md)               | The op envelope (HLC, `parents`, `conflict.recorded`) the exchange depends on. |
| [ACCEPTED-WORK-AND-EVENTS.md](../../04-contracts/ACCEPTED-WORK-AND-EVENTS.md) | The inventory/handshake message schema.                                        |
| [Module dependency map](../../01-architecture/module-dependency-map.md)       | The crate dependency graph and the acyclic invariant.                          |
