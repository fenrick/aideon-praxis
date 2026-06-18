# Derived runtime and projections

What lives in the derived runtime, the three consistency tiers it is maintained in, the rebuild-correctness property that makes it safe to delete, and the incremental-view-maintenance correctness condition that keeps it honest. The runtime _contract_ between Mneme and its consumers is [PROJECTION-AND-INVALIDATION](../../04-contracts/PROJECTION-AND-INVALIDATION.md); the consistency _guarantee_ is [ADR-0027](../../06-adrs/ADR-0027-projection-consistency-model.md). This file is the module-level view.

---

## The runtime is the derived half

The database under `.aideon/runtime/` is the **derived** half of Mneme. It holds nothing that cannot be reconstructed from the canonical op log and schema ([canonical-vs-derived](../../01-architecture/boundary/canonical-vs-derived.md)):

- Resolved entity and relationship records (`aideon_entities`, `aideon_edges`).
- Typed fact rows (`aideon_prop_fact_*`, `aideon_edge_exists_facts`).
- Indexed-field tables (`aideon_idx_field_*`) — maintained synchronously in the write path.
- Graph projection tables (`aideon_graph_projection_edges`) — adjacency for analytics.
- Schema caches (`aideon_effective_schema_cache`, `aideon_type_schema_head`).
- The job queue (`aideon_jobs`) and the change feed (`aideon_change_feed`).
- Integrity, PageRank, and computed-attribute caches.

The full table inventory and column shapes are in [sqlite](./SQLITE.md).

---

## Three consistency tiers

Not all derived state needs the same freshness. Mneme maintains it in three tiers, trading latency against write cost ([PROJECTION-AND-INVALIDATION](../../04-contracts/PROJECTION-AND-INVALIDATION.md)):

| Tier                     | When updated                                | Examples                                                                      | Freshness a reader sees                                     |
| ------------------------ | ------------------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------- |
| **Sync-in-tx**           | Inside the write transaction, before commit | Field index tables, projection edge rows, entity timestamps, change-feed rows | Always Fresh after commit; the writer reads its own effect. |
| **Near-real-time async** | On the job queue, bounded latency           | Effective-schema cache, connectivity checks, pre-aggregations                 | Fresh or briefly `Stale` / `Rebuilding`, surfaced honestly. |
| **Batch / on-demand**    | Scheduled or explicitly triggered           | PageRank scores, integrity audits, compaction                                 | May be `Stale` until the next run; the badge says so.       |

The tiering is the mechanism behind the consistency guarantee: sync-in-tx state gives the writer causal read-your-writes; async and batch state converge eventually with explicit staleness, never served as Fresh when it is not ([ADR-0027](../../06-adrs/ADR-0027-projection-consistency-model.md)). A result that is mid-rebuild is shown with the **Rebuilding** result state ([DOCUMENTATION-STANDARD §9](../../02-standards/DOCUMENTATION-STANDARD.md)), never as if Fresh.

### Job deduplication

Jobs are deduplicated by a `dedupe_key`: a bulk ingest of a thousand metamodel operations enqueues one schema-compile job per _type_, not a thousand per _operation_. Failed jobs are retried with backoff and never corrupt authoritative data — a failed projection refresh leaves the prior projection in place and surfaces a freshness badge, rather than writing a half-computed result. The job-queue schema (lease, attempts, `max_attempts`, `next_run_after`, the unique dedup index) is in [sqlite](./SQLITE.md); the orchestration discipline it mirrors is [Continuum](../continuum/README.md)'s.

---

## Rebuild correctness

The derived runtime is safe to delete because the op log is the oracle. This is the invariant that makes the whole storage boundary trustworthy ([canonical-vs-derived](../../01-architecture/boundary/canonical-vs-derived.md)):

> Deleting the entire `.aideon/runtime/` directory loses no user data. A rebuild from `model/ops/` and `model/schema/` must reproduce the same resolved twin — the same facts, the same effective graphs at the same viewpoints — that existed before deletion.

Two consequences the design holds itself to:

- **The runtime is never the source of truth.** No read path returns a value that exists only in the runtime and cannot be reconstructed from canonical files. Such a value would be canonical-by-accident, a defect.
- **Rebuild is deterministic against a fixed op log.** Given the same operations and schema, two rebuilds produce equivalent derived state. Determinism is what lets a rebuild be _checked_ against the prior state, not merely hoped equal — the same property the deterministic export format relies on ([ADR-0007](../../06-adrs/ADR-0007-deterministic-package-export.md)).

The cost is named: a cold open after the runtime is deleted, or after a large import, pays the full replay-and-reproject cost before the twin is queryable, and that cost grows with op-log size. The architecture accepts a bounded rebuild cost — surfaced as an [accepted job](../../04-contracts/ACCEPTED-WORK-AND-EVENTS.md) with progress — in exchange for a portable, tamper-proof workspace. Checkpoints and incremental refresh (below, and [export-import-replay](./export-import-replay.md)) reduce the cost without changing the rule.

---

## Incremental view maintenance must equal rebuild

An `incremental` projection applies a delta after each commit instead of rebuilding from scratch. The correctness condition is strict: an incremental delta-apply **must** produce the same state a full rebuild from the op log would _(Gupta & Mumick, Maintenance of Materialized Views, 1995)_, fixed by [ADR-0027](../../06-adrs/ADR-0027-projection-consistency-model.md). Incremental maintenance is an _optimisation of_ rebuild, never a different answer. When the delta log is missing or inconsistent, the projection falls back to a full rebuild — rebuild is the ground truth incremental maintenance is checked against.

**Invalidation cascades.** A write that invalidates a projection invalidates every projection derived from it, transitively, before the write transaction closes. Integrity scores are themselves derived and are recomputed when their inputs are invalidated ([ADR-0020](../../06-adrs/ADR-0020-integrity-scoring-model.md)); a cascade that stopped short would leave a downstream projection confidently wrong. A projection is correct only for its context dimensions — a projection built at one viewpoint or scenario is not served for another (`PROJECTION_CONTEXT_MISMATCH`).

---

## Worked example — rebuilding `.aideon/runtime/` from the op log

A user reports that the analytics surface is showing wrong degree counts on the seed workspace. The support path is a runtime rebuild — safe because the runtime owns no truth:

1. The host closes the workspace and deletes `.aideon/runtime/` in its entirety. `model/ops/`, `model/schema/`, and `objects/sha256/` are untouched.
2. On the next open, the host detects the absent runtime and dispatches a rebuild as an [accepted job](../../04-contracts/ACCEPTED-WORK-AND-EVENTS.md), reporting progress by event.
3. Mneme replays the op log in asserted-time order. The two seed commits — `baseline-graph` (the twelve entities and ten relationships) and `baseline-plan` (the two `PlanEvent`s and their `plan_effect` relationships) — re-derive every fact: `Automation Orchestrator`'s `disposition = Migrate`, its `realises` relationship to `Automation Fabric`, the FY26 plan events, and so on.
4. Sync-in-tx projections (indexes, projection edges, change feed) are rebuilt inline as each op replays; near-real-time and batch artefacts (effective-schema cache, PageRank, integrity) are enqueued. The partition's HLC watermark (`aideon_hlc_state`) is restored to `max(asserted_at)` over the replayed operations **before the workspace is write-enabled**, so the next authored op mints an HLC strictly after all of history ([bitemporal-and-hlc](./bitemporal-and-hlc.md), [ADR-0022](../../06-adrs/ADR-0022-hlc-clock-model.md)).
5. The rebuilt runtime is checked equivalent to the canonical state: resolving any slot at any viewpoint yields the same fact it did before deletion. The degree counts are now correct, because they were re-derived from the operations rather than from the corrupted cache.

No user data is lost, because none of it lived only in the runtime. The wrong degree counts were a derived-state defect, recoverable by rebuild — exactly the property the boundary guarantees.

---

## Bounds

- **Full rebuild** is `O(N)` in the number of operations, plus the projection cost; it is the upper bound a cold open or a corruption recovery pays.
- **Incremental delta-apply** is `O(Δ)` in the facts a commit touches plus the transitive projections those facts invalidate — the common case, and the reason a normal write is cheap.
- **Cascade depth** is bounded by the projection dependency graph, which is acyclic by construction (a projection never depends on itself, directly or transitively).

---

## References & standards

_Normative:_

- Gupta & Mumick — _Maintenance of Materialized Views_, 1995. The correctness condition for incremental projection refresh.

_Informative:_

- Kleppmann — _Designing Data-Intensive Applications_, 2017. Derived-data discipline and causal-vs-eventual consistency.

## Related documents

| Document                                                                         | What it covers                                                         |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [PROJECTION-AND-INVALIDATION](../../04-contracts/PROJECTION-AND-INVALIDATION.md) | The projection-descriptor, freshness-class, and invalidation contract. |
| [ADR-0027](../../06-adrs/ADR-0027-projection-consistency-model.md)               | The consistency guarantee and incremental-equals-rebuild condition.    |
| [ADR-0007](../../06-adrs/ADR-0007-deterministic-package-export.md)               | Deterministic export, which relies on rebuild determinism.             |
| [Canonical vs derived](../../01-architecture/boundary/canonical-vs-derived.md)   | The rebuild-correctness invariant in full.                             |
| [SQLite specification](./SQLITE.md)                                              | The table families these tiers maintain.                               |
