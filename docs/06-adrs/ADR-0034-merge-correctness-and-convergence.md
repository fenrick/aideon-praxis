# ADR-0034: Merge Correctness and Convergence

- Status: Proposed
- Date: 2026-06-16
- Depends-On: ADR-0005 (sync and conflict model), ADR-0029 (Koinon), ADR-0001 (workspace is canonical authority), ADR-0002 (portable workspace format)
- Relates-To: ADR-0009 (temporal model), ADR-0018 (idempotency), ADR-0022 (HLC clock), ADR-0027 (projection consistency)

## Context

[ADR-0005](./ADR-0005-sync-and-conflict-model.md) fixes the exchange unit (operations plus missing blob hashes) and the conflict record; [ADR-0029](./ADR-0029-collaboration-and-sync-koinon.md) gives that model an owner in [Koinon](../05-modules/koinon/README.md). Neither states the durable **correctness guarantee** a reader needs to trust offline collaboration: when two replicas of the same workspace edit while disconnected and later merge, what guarantees they end up at the same twin, and what exactly does "the same" mean?

Without that guarantee recorded, "peers converge" is an aspiration, not a contract. The hard cases are concrete: two offline edits to the same slot; operations that arrive out of causal order; a replica that merges the same operation set twice. The data substrate already carries what a guarantee can be built on — the op log is canonical and append-only ([ADR-0001](./ADR-0001-workspace-is-canonical-authority.md)), each operation is idempotent by `(partition, op_id)` ([op-fact-schema-model](../05-modules/mneme/op-fact-schema-model.md)), each carries an HLC asserted time and causal `deps` in its envelope ([ADR-0002](./ADR-0002-portable-workspace-format.md); [ADR-0022](./ADR-0022-hlc-clock-model.md)), and the resolver is a deterministic pure function of operations ([bitemporal-and-hlc](../05-modules/mneme/bitemporal-and-hlc.md)). This ADR states the guarantee those properties combine to give, and draws the line between what is decided and what stays deferred.

The relevant theory is settled: state-based replicated data types converge when replicas merge by a join over a monotone lattice (Shapiro et al., _Conflict-free Replicated Data Types_, 2011), and op-log replay converges when the read model is a deterministic function of a totally-ordered, replicated log (Fowler; Young, _Event Sourcing & CQRS_). This decision composes the two: the op set is the replicated state, set union is the join, and the resolver is the deterministic read function over it.

## Governance Framing

- **Decision type:** Invariant (the convergence guarantee two merging replicas obtain) + stable seam (op-set union plus deterministic resolution as the merge mechanism).
- **Known future pressure:** real concurrent editing; larger op logs raising merge and replay cost; replicas on different derived-runtime engine versions; schema changes mid-flight; invariants that may need selective coordination beyond a converging exchange.
- **What stays stable:** merge is **set union over the canonical op log** followed by **deterministic resolution**; two replicas that have ingested the same set of operations resolve every viewpoint identically; ingestion is idempotent and order-independent; genuine conflicts are recorded operations, never silent overwrites.
- **What is provisional:** which slot kinds carry CRDT merge semantics (`OrSetUpdate`, `CounterUpdate`) versus last-writer-wins-by-HLC resolution; the exact conflict-detection predicate at the slot boundary.
- **What is deferred:** the live wire protocol and transport ([ADR-0005](./ADR-0005-sync-and-conflict-model.md)); selective coordination for any invariant that cannot converge purely; cross-peer projection consistency ([ADR-0027](./ADR-0027-projection-consistency-model.md) open question).
- **Why hard to reverse:** the guarantee is the meaning of "collaboration is safe" — every peer, the conflict surface, and the rebuild path rely on it; weakening it would mean replicas could silently disagree about the twin, which is the failure the whole model exists to prevent.

## Decision

- **The merge of two replicas is set union over their op logs.** Each operation is an immutable, content-identified envelope ([ADR-0002](./ADR-0002-portable-workspace-format.md)). Merging two replicas means taking the union of their operation sets — transferring the operations each lacks. The op log is therefore a grow-only set under merge: a join over a set-inclusion lattice, the convergent state-based form (Shapiro et al., 2011). Union is commutative, associative, and idempotent, so the order in which replicas exchange, and how many times they do, does not change the merged set.

- **Ingestion is idempotent and order-independent.** A re-received operation is a no-op by `(partition, op_id)` ([op-fact-schema-model](../05-modules/mneme/op-fact-schema-model.md); [ADR-0018](./ADR-0018-idempotency-and-deduplication.md)), so merging the same operation twice changes nothing. Operations need not arrive in causal order: each carries `deps`, and ingestion applies them in a dependency-respecting order before resolution ([export-import-replay](../05-modules/mneme/export-import-replay.md)). Arrival order is a hint, never the determinant of state.

- **Effective state is a deterministic function of the op set.** The resolver picks one fact per slot at a viewpoint by a fixed precedence chain — valid-time containment, interval specificity, latest asserted time (HLC), then `op_id` tie-break ([bitemporal-and-hlc](../05-modules/mneme/bitemporal-and-hlc.md)) — and combines layers by the viewpoint's layer policy ([ADR-0009](./ADR-0009-temporal-model-valid-interval-layer-policy-viewpoint.md)). Every input to that chain is carried in the operations themselves; nothing depends on wall-clock arrival, replica identity, or merge order. The chain is total: the HLC is byte-comparable and the `op_id` tie-break is the deterministic last resort, so there is exactly one winner.

- **The convergence invariant.** **Two replicas that have ingested the same set of operations resolve every viewpoint to the same effective state.** This is strong eventual consistency (Shapiro et al., 2011): replicas that have seen the same operations are in equivalent states, with no further coordination required. It holds because the merged op set is order-independent (union) and the resolution over it is deterministic (the precedence chain). Derived runtime is never exchanged and never affects the guarantee — each replica rebuilds it locally from the operations ([ADR-0001](./ADR-0001-workspace-is-canonical-authority.md)), so two replicas can run different storage-engine versions and still converge ([ADR-0004](./ADR-0004-storage-engine-abstraction.md)).

- **Convergence and conflict are distinct outcomes, both deterministic.** Most concurrent edits converge silently: additive relations union, idempotent operations deduplicate, and incompatible-but-orderable claims resolve by the precedence chain to a single winner without losing the loser (it remains belief-visible). A residual class cannot converge without discarding a deliberate human claim — same subject, slot, valid-time interval, and preference level with incompatible values; a delete-versus-edit race; a schema change that alters a slot's meaning; or two cleartext blobs each claiming to be the replacement ([ADR-0005](./ADR-0005-sync-and-conflict-model.md)). For that class, convergence is the **deterministic decision that a conflict exists**: every replica that has the same operations detects the same conflict and records it identically as a `conflict.recorded` operation. The conflict record is itself an operation, so it merges and resolves by the same rules — replicas converge on _the conflict_, then a human resolves it by an authored superseding Change Event ([Koinon merge UX](../05-modules/koinon/merge-ux.md)).

## Considered Options

- **A whole-document CRDT (e.g. an RGA/JSON CRDT over the model) (rejected):** would make every edit converge automatically, but at the cost of silently merging incompatible deliberate claims — the design's central refusal. CRDT semantics are adopted only where loss-free union is meaningful (additive sets, counters); the rest resolves deterministically or is surfaced as a conflict.
- **Last-writer-wins by wall clock across the board (rejected):** simple, but a backwards clock or skew silently discards the genuinely-later edit, and it has no notion of valid-time specificity. The HLC plus the full precedence chain gives a total order that is robust to skew ([ADR-0022](./ADR-0022-hlc-clock-model.md)) and respects the bitemporal model.
- **A coordinating server as the merge authority (rejected for the default):** the simplest correctness story, but it breaks local-first offline editing and reintroduces the central authority the model exists without. A hosted relay remains an optional transport variant ([ADR-0005](./ADR-0005-sync-and-conflict-model.md)), not the convergence mechanism.

## Consequences

- Offline editing is safe by construction: two replicas can diverge arbitrarily while disconnected and are guaranteed to converge once they have exchanged operations, because merge is union and resolution is deterministic.
- The guarantee is checkable. Because resolution is a pure function of the op set, a test can assert that two replicas given the same operations in different orders resolve identically — the same rebuild-equivalence discipline used for projections and snapshots ([ADR-0027](./ADR-0027-projection-consistency-model.md); [export-import-replay](../05-modules/mneme/export-import-replay.md)).
- Conflict detection must itself be deterministic across replicas, or two peers could record different conflicts from the same operations and diverge on the conflict surface. The detection predicate is therefore a function of the operation set alone, not of which replica ran it.
- Convergence speaks only to canonical effective state. Projection freshness across peers is a separate, still-deferred question ([ADR-0027](./ADR-0027-projection-consistency-model.md)); a converged replica may briefly show a `stale` badge on a derived view until it rebuilds.
- A worked example: peers A and B disconnect from the seed workspace. A adds a `realises` relationship from `n:capability:customer-insight`; B adds an `accesses` relationship from `n:application:automation-orchestrator` to `n:dataentity:customer-record`, and both also re-import an overlapping op segment. After exchange, both hold the union of all operations: the duplicate segment dedupes by `op_id`, the two new relationships union additively, and every viewpoint resolves identically on both replicas — strong eventual consistency, no conflict. Had both instead set `automation-orchestrator.disposition` to incompatible values over the same interval, both would deterministically record the same `conflict.recorded` operation and converge on the conflict.

## Follow-ups / Open Questions

- Which slot kinds carry CRDT merge semantics (`OrSetUpdate`, `CounterUpdate`) versus last-writer-wins-by-HLC, and where the boundary sits against the conflict predicate.
- A property-test harness asserting order-independence of merge and resolution-equality for replicas with identical op sets.
- Cross-peer projection consistency once derived state is shared or compared between peers ([ADR-0027](./ADR-0027-projection-consistency-model.md)).
- Whether any modelled invariant needs selective coordination beyond the converging exchange ([ADR-0005](./ADR-0005-sync-and-conflict-model.md) defers this).

## References & standards

- Shapiro, Preguiça, Baquero, Zawirski — **Conflict-free Replicated Data Types**, 2011 _(normative: strong eventual consistency, the join-over-a-lattice convergence condition, the grow-only-set CRDT)_.
- Fowler; Young — **Event Sourcing & CQRS** _(normative: the read model as a deterministic function of a replayable, replicated log)_.
- Kulkarni, Demirbas, et al. — **Logical Physical Clocks (HLC)**, 2014 _(informative: the totally-ordered asserted-time clock the precedence chain relies on)_.
- Lamport — **Time, Clocks, and the Ordering of Events**, 1978 _(informative: causal order, the basis for `deps`-respecting ingestion)_.

## Related documents

| Document                                                                       | What it covers                                                        |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| [ADR-0005](./ADR-0005-sync-and-conflict-model.md)                              | The exchange unit and conflict record this ADR gives a guarantee for. |
| [ADR-0029](./ADR-0029-collaboration-and-sync-koinon.md)                        | Koinon, the module that owns and operationalises the merge.           |
| [ADR-0009](./ADR-0009-temporal-model-valid-interval-layer-policy-viewpoint.md) | The resolution precedence chain and layer policy merge depends on.    |
| [ADR-0018](./ADR-0018-idempotency-and-deduplication.md)                        | Idempotent ingestion under retry and replay.                          |
| [bitemporal-and-hlc](../05-modules/mneme/bitemporal-and-hlc.md)                | The deterministic resolver and the totally-ordered HLC.               |
