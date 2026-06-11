# Consistency model

What a reader sees after a write, and when. The guarantee is **causal read-your-writes for the writer's session, eventual consistency with explicit staleness for everyone else** — with cascade invalidation and incremental maintenance that is provably equivalent to a full rebuild. The decision is [ADR-0027](../../06-adrs/ADR-0027-projection-consistency-model.md); Gupta & Mumick supply the incremental-maintenance correctness condition.

---

## Read-your-writes for the writer

Writes serialise through the single-writer queue ([ADR-0004](../../06-adrs/ADR-0004-storage-engine-abstraction.md)), and an `incremental` projection's delta-apply runs immediately after commit on that same queue ([invalidation-events.md](./invalidation-events.md)). A writer's own subsequent read therefore observes its own effect. The guarantee is **causal consistency** for the writer's session: effects are observed in the order they were caused.

## Eventual consistency with explicit staleness for others

A reader who did not perform the write converges after the projection refreshes. Until then the read carries a [`ProjectionFreshnessStatus`](./freshness-states.md) of `stale` or `rebuilding` and the corresponding result-state badge ([honest-state, §9](../../02-standards/DOCUMENTATION-STANDARD.md)). Eventual convergence is honest only because staleness is surfaced, never hidden — a stale read is labelled, not silently served as fresh. The rejected alternative, best-effort eventual consistency with no staleness signal, is exactly the dishonesty the honest-state vocabulary exists to prevent.

The trade-off ([ADR-0027](../../06-adrs/ADR-0027-projection-consistency-model.md)): strong synchronous consistency for all readers would block every read on every refresh and serialise the whole app behind projection maintenance. Causal-for-writer plus eventual-with-staleness gives correctness where it is needed without the global stall.

## Cascade invalidation

A write that invalidates a projection invalidates every projection derived from it, transitively, before the write transaction closes. Integrity scores ([ADR-0020](../../06-adrs/ADR-0020-integrity-scoring-model.md)) are themselves derived (**Inferred** content, [§8.1](../../02-standards/DOCUMENTATION-STANDARD.md)) and are recomputed when their inputs are invalidated; a cascade that stopped short would leave a downstream projection confidently wrong. The cascade follows the [invalidation tags](./invalidation-events.md).

## Incremental view maintenance equals rebuild

An `incremental` projection's delta-apply **must** produce the same state a full [rebuild from the op log](./rebuild-from-workspace.md) would (Gupta & Mumick, _Maintenance of Materialized Views_, 1995). This is the correctness condition: incremental refresh is an optimisation of rebuild, never a different answer. When the delta log is missing or inconsistent, the projection falls back to a full rebuild — rebuild is the ground truth incremental maintenance is checked against.

## Per-context, not global

A projection built at one viewpoint or scenario is not served for another ([projection-descriptor.md](./projection-descriptor.md), `PROJECTION_CONTEXT_MISMATCH`); the renderer keys its cache by the same [viewpoint coordinates](../temporal-and-scenario/viewpoint-shape.md) ([ADR-0026](../../06-adrs/ADR-0026-frontend-state-architecture.md)). Consistency is per-context, not global.

## Worked example

A user asserts a new `accesses` relationship from the seed `Application` `app_ledger` to the `DataEntity` `de_invoices`. The op append invalidates the `effective_graph_workspace` projection and cascades to any lineage and integrity projections over that subgraph. The writer's next graph read shows the new edge (read-your-writes). A concurrent reader in a second window sees a `stale` badge until delta-apply completes, after which both windows converge to the state a full rebuild would produce — verifying the Gupta & Mumick equivalence.

## References & standards

- Gupta & Mumick — **Maintenance of Materialized Views**, 1995 _(normative: incremental view-maintenance correctness)_.
- Kleppmann — _Designing Data-Intensive Applications_, 2017 _(informative: causal vs eventual consistency)_.

## Related documents

| Document                                                           | What it covers                                                 |
| ------------------------------------------------------------------ | -------------------------------------------------------------- |
| [ADR-0027](../../06-adrs/ADR-0027-projection-consistency-model.md) | The consistency decision.                                      |
| [rebuild-from-workspace.md](./rebuild-from-workspace.md)           | The rebuild oracle incremental maintenance is checked against. |
| [freshness-states.md](./freshness-states.md)                       | The staleness signal a non-writer reader sees.                 |
| [ADR-0004](../../06-adrs/ADR-0004-storage-engine-abstraction.md)   | The single-writer queue that enables read-your-writes.         |
