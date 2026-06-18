# Performance and scale

The size envelope Aideon Desktop is designed to carry, the benchmark points to measure at each scale, how the canonical op log grows and is compacted, how long a derived-cache rebuild may take, which projections are maintained incrementally versus in batch, and why the projection cascade is deterministic. For a reader who needs to know how large a twin the desktop build targets and what the architecture promises — and does not promise — at that size.

> **Numeric budgets are targets and design intent, not measured facts.** Every node count, edge count, and time figure below is a design budget the architecture aims at, against which an implementation is later measured. Where no measurement exists, the figure says what the design is trying to achieve, not what has been observed; a measured figure, when it exists, supersedes the target and is recorded against the relevant module ([`../05-modules/`](../05-modules/)). This mirrors the posture of [quality-attributes](./quality-attributes.md), which states the latency budgets this document does not restate.

This document is the system-wide size-and-scale view. The per-operation latency budgets live in [Mneme's performance budget](../05-modules/mneme/performance-budget.md) and the [quality attributes](./quality-attributes.md) scenarios (P1–P5); the analytics complexity bounds live in [Metis' algorithms and bounds](../05-modules/metis/algorithms-and-bounds.md). This document cross-links those rather than duplicating them.

---

## Contents

1. [Scale envelopes](#scale-envelopes)
2. [Benchmark points to measure](#benchmark-points-to-measure)
3. [Op-log growth and compaction](#op-log-growth-and-compaction)
4. [Rebuild SLOs](#rebuild-slos)
5. [Projection and index strategy](#projection-and-index-strategy)
6. [Cascade determinism](#cascade-determinism)
7. [The trade-off named](#the-trade-off-named)

---

## Scale envelopes

The desktop build targets three reference graph sizes, reused from the analytics and storage budgets so one set of numbers travels across the corpus. A size is stated as resolved entities and relationships in the effective graph at a single viewpoint — the working set the renderer and analytics see — not the total op-log length, which grows separately ([op-log growth](#op-log-growth-and-compaction)).

| Envelope   | Entities (`n`) | Relationships (`m`) | What it represents                                                                           | Posture                                                                                                                                                                                      |
| ---------- | -------------- | ------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Small**  | ~5k            | ~15k                | A single domain or a department's application estate. The everyday working size.             | **Interactive throughout.** Every read meets its latency budget; no operation is surfaced Bounded by size alone.                                                                             |
| **Medium** | ~50k           | ~150k               | A mid-size enterprise twin across several domains.                                           | **Interactive for scoped reads; Bounded for whole-twin analytics.** Centrality and impact may report **Partial / Bounded** with explicit coverage.                                           |
| **Large**  | ~200k          | ~600k               | The upper design target for the desktop build — a large enterprise twin held on one machine. | **The hard limit the desktop build is designed to.** Reads stay scoped and interactive; whole-twin analytics is bounded or sampled; a full rebuild is a progress-reported job, never inline. |

The relationship counts assume a sparse enterprise graph (`m ≈ 3n`), the regime the [analytics bounds](../05-modules/metis/algorithms-and-bounds.md) assume; a denser graph reaches a bound sooner, which the result states honestly rather than failing.

**200k entities is the design ceiling for the desktop build, not an enforced cap.** A workspace may grow past it; what the architecture stops promising past it is whole-twin interactivity. Beyond the ceiling the single-machine assumptions ([ADR-0001](../06-adrs/ADR-0001-workspace-is-canonical-authority.md)) weaken, and the answer is a hosted backend behind the same storage trait ([ADR-0004](../06-adrs/ADR-0004-storage-engine-abstraction.md)), not a larger desktop. Naming the ceiling is itself the honest move: a build that pretended to be unbounded on a laptop would mislead.

---

## Benchmark points to measure

A scale target is only meaningful if it names the measurement that confirms it. The following are the benchmark points an implementation runs at each envelope, on the synthetic graphs the testing strategy provides ([TESTING-STRATEGY.md](../02-standards/TESTING-STRATEGY.md)); each maps to a budget stated elsewhere, so a measured number can supersede a target in place.

| Benchmark                                    | What it measures                                                       | Budget it confirms                                                                                          | At 5k / 50k / 200k                                 |
| -------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| **Single-slot resolution**                   | Resolve one slot at a viewpoint on a warm runtime.                     | Sub-millisecond; independent of op-log size ([Mneme budget](../05-modules/mneme/performance-budget.md)).    | Flat across all three envelopes.                   |
| **Single write (append + sync projections)** | Append one Change Event's op batch and refresh sync-in-tx projections. | Bounded, committed before the call returns; `O(Δ)` ([quality-attributes](./quality-attributes.md) P2).      | Flat; cost is in `Δ`, not `n`.                     |
| **Bounded N-hop slice**                      | Adjacency walk to depth N with a fanout cap.                           | Interactive for small N ([Mneme budget](../05-modules/mneme/performance-budget.md)); Bounded otherwise.     | Interactive; Bounded label appears sooner at 200k. |
| **PageRank (whole twin)**                    | Power iteration to convergence or the iteration cap.                   | `O(k·m)` ([Metis bounds](../05-modules/metis/algorithms-and-bounds.md)); **approximated** if capped.        | Exact at 5k; may be capped/sampled at 200k.        |
| **Betweenness (whole twin)**                 | Brandes, exact or sampled-source.                                      | `O(n·m)` exact ([Metis bounds](../05-modules/metis/algorithms-and-bounds.md)); **approximated** if sampled. | Exact at 5k; sampled at 50k–200k.                  |
| **Cold open, runtime present**               | Open a workspace whose `.aideon/runtime/` cache exists.                | Fast — index load only, no replay ([Mneme budget](../05-modules/mneme/performance-budget.md)).              | Near-flat; index size grows with `n`.              |
| **Full rebuild from canonical**              | Delete the runtime cache and rebuild from the op log.                  | `O(N)` in operations ([rebuild SLOs](#rebuild-slos)); a progress-reported job.                              | Grows with op-log length; see below.               |

The headline the benchmarks must protect, restated from the [Mneme budget](../05-modules/mneme/performance-budget.md): **interactive reads are independent of op-log size.** A benchmark that showed slot resolution slowing as history grew would be a defect, not a tuning problem — it would mean a read had started depending on the log rather than on an indexed range scan.

---

## Op-log growth and compaction

The op log only grows. This is a deliberate consequence of supersession-not-deletion ([op / fact / schema model](../05-modules/mneme/op-fact-schema-model.md)): an obsolete fact is outranked by a later operation, never removed, because removing it would lose the asserted-time axis and the ability to answer "what did we believe last quarter?". The cost is named plainly — **history accumulates, and pruning is a deliberate retention decision, never an inline side effect of a change**.

Two distinct sizes therefore grow at different rates, and the design keeps them separate:

- **Working-set size** — the resolved entities and relationships at one viewpoint. This is what the [scale envelopes](#scale-envelopes) measure and what bounds interactive reads. It does not grow with history; superseding a fact does not enlarge the working set.
- **Op-log length (`N`)** — the total operations ever appended. This grows monotonically with editing and ingestion. Only the [full-rebuild](#rebuild-slos) path is `O(N)`; no interactive read is.

**Snapshot-plus-tail is the compaction-of-cost mechanism, and it touches only derived state.** The accelerated cold-open path exports the resolved derived state at an asserted-time checkpoint and replays only the tail of operations after it ([export-import-replay](../05-modules/mneme/export-import-replay.md)). It does not compact the canonical log — the op log stays whole and replayable — it compacts the _cost of reconstructing_ the runtime from it. The correctness condition is strict: **snapshot plus tail replay must produce identical resolution to a full replay** _(Gupta & Mumick, Maintenance of Materialized Views, 1995; [ADR-0027](../06-adrs/ADR-0027-projection-consistency-model.md))_, and the system falls back to a full replay if a snapshot fails its check.

**Canonical log compaction (true pruning) is a retention decision, not an automatic GC.** Where an organisation's retention policy genuinely permits discarding belief history before a date, compaction would rewrite the log to a baseline checkpoint plus the operations after it — a destructive, governed, opt-in operation that loses belief-pinned reads before the checkpoint. It is **design intent and deferred**: no compaction-of-canonical path exists, and the default posture is that the log is immutable and append-only ([ADR-0001](../06-adrs/ADR-0001-workspace-is-canonical-authority.md)). Content-addressed blobs garbage-collect independently — an unreferenced blob can be reclaimed by hash without touching the op log ([content-addressed-blobs](../05-modules/mneme/content-addressed-blobs.md)) — because a blob carries no belief, only bytes.

---

## Rebuild SLOs

A rebuild reconstructs the derived runtime cache from the canonical op log and schema. It is paid on a cold open after the cache is deleted or corrupted, and after a large import ([derived-runtime-and-projections](../05-modules/mneme/derived-runtime-and-projections.md)). Because the cache owns no truth, a rebuild loses no data ([quality-attributes](./quality-attributes.md) R1) — the only question is how long it takes, and that is `O(N)` in operations plus projection cost.

The rebuild is **always surfaced as a progress-reporting [accepted job](../04-contracts/ACCEPTED-WORK-AND-EVENTS.md), never inline in an interactive read.** While it runs, dependent surfaces show the **Rebuilding** result state ([DOCUMENTATION-STANDARD §9](../02-standards/DOCUMENTATION-STANDARD.md)) over a prior snapshot, not a blocked UI. The SLOs below are therefore _time-to-queryable_ targets for the job, not interactive-latency budgets.

| Scale (op-log length, roughly proportional to working set) | Full rebuild target (design intent)               | Snapshot-plus-tail target (design intent)                                                                       | Surfaced as                                                        |
| ---------------------------------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| **Small** (~5k entities, short history)                    | A few seconds; effectively a fast open.           | Not needed at this size.                                                                                        | A brief Rebuilding state, if shown at all.                         |
| **Medium** (~50k entities)                                 | Tens of seconds.                                  | A few seconds (load snapshot + short tail).                                                                     | A progress-reported job with a Rebuilding badge.                   |
| **Large** (~200k entities, long history)                   | Under a few minutes for the cold-rebuild ceiling. | Tens of seconds — the design relies on snapshot-plus-tail to keep the routine cold open well inside the budget. | A progress-reported job; the routine open uses snapshot-plus-tail. |

These targets are **design intent to be measured at each envelope** ([benchmark points](#benchmark-points-to-measure)); none is a recorded figure. The design's claim is the _shape_: full rebuild is linear in history and is the bound a corruption recovery pays, while snapshot-plus-tail keeps the _routine_ cold open bounded by the snapshot load plus a short tail regardless of total history. The two are kept honest by being checkable against each other — the snapshot is validated against a full replay, which is also the recovery path ([export-import-replay](../05-modules/mneme/export-import-replay.md)).

---

## Projection and index strategy

The derived runtime is maintained in **three consistency tiers**, trading freshness against write cost ([derived-runtime-and-projections](../05-modules/mneme/derived-runtime-and-projections.md), [ADR-0027](../06-adrs/ADR-0027-projection-consistency-model.md)). The tier a projection sits in is what makes a given read interactive or eventually-consistent, so the placement is a scale decision, not an implementation detail.

| Projection / index                                                                                           | Tier                     | Maintenance                                       | Why there                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------ | ------------------------ | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Indexed-field tables, graph adjacency (`aideon_graph_projection_edges`), entity timestamps, change-feed rows | **Sync-in-tx**           | **Incremental**, in the write transaction         | A read after a write must see its own effect ([ADR-0027](../06-adrs/ADR-0027-projection-consistency-model.md), read-your-writes); these are what scoped interactive reads hit. |
| Effective-schema cache, connectivity checks, pre-aggregations                                                | **Near-real-time async** | **Incremental**, off the write path               | Useful soon but not in the writer's critical path; brief Stale / Rebuilding is acceptable and surfaced.                                                                        |
| PageRank scores, integrity audits, compaction-of-cost work                                                   | **Batch / on-demand**    | **Batch** (rebuild over the delta or whole scope) | Whole-graph computations too expensive to run per write; their result carries a freshness badge until the next run.                                                            |

The rule that decides incremental versus batch: **a projection is maintained incrementally when an `O(Δ)` delta-apply is both cheap and provably equal to a rebuild; it is batch when only a whole-scope recomputation is well-defined.** Incremental maintenance is an _optimisation of_ rebuild and must produce the same state a full rebuild would _(Gupta & Mumick, 1995; [ADR-0027](../06-adrs/ADR-0027-projection-consistency-model.md))_ — when the delta log is missing or inconsistent, the projection falls back to a full rebuild, which is the ground truth incremental maintenance is checked against. PageRank is batch precisely because no cheap exact delta-apply over a whole-graph eigenvector exists; the field indexes are incremental because a single fact's change touches a bounded set of index rows.

A projection is correct only for its **context dimensions** — workspace, as-of valid time, as-of asserted time, layer (or policy), scenario, scope. A projection built at one viewpoint is never served for another (`PROJECTION_CONTEXT_MISMATCH`), and the renderer keys its cache by the same coordinates ([scenarios-and-layers](../05-modules/mneme/scenarios-and-layers.md), [ADR-0026](../06-adrs/ADR-0026-frontend-state-architecture.md)). Consistency is per-context, never global.

---

## Cascade determinism

When a write invalidates a projection, it invalidates **every projection derived from it, transitively, before the write transaction closes** ([derived-runtime-and-projections](../05-modules/mneme/derived-runtime-and-projections.md), [ADR-0027](../06-adrs/ADR-0027-projection-consistency-model.md)). A cascade that stopped short would leave a downstream projection confidently wrong. The cascade is **deterministic given the op set**: the same operations, applied in the same asserted-time order, invalidate and recompute the same projections to the same result, every time.

Three properties make that determinism hold, and one platform risk is bounded explicitly:

- **A total order on operations.** Operations are ordered by asserted time, a total order because the HLC is byte-comparable, with `op_id` as the tie-break of last resort ([bitemporal-and-hlc](../05-modules/mneme/bitemporal-and-hlc.md), [op / fact / schema model](../05-modules/mneme/op-fact-schema-model.md)). There is no wall-clock dependence and no arrival-order dependence: import is order-robust because asserted time, not arrival, fixes the outcome ([export-import-replay](../05-modules/mneme/export-import-replay.md)).
- **An acyclic projection dependency graph.** A projection never depends on itself, directly or transitively, so the cascade has a bounded depth and a well-defined topological order ([derived-runtime-and-projections](../05-modules/mneme/derived-runtime-and-projections.md), Bounds). A cyclic projection graph would make the cascade's result depend on visitation order — it is forbidden by construction.
- **Stable tie-breaks in computation.** Where a computed result could otherwise vary with floating-point evaluation order — PageRank scores, centrality rankings — comparisons and ties break on a stable identifier ordering, so floating-point ties do not produce non-deterministic order ([Metis determinism and bounds](../05-modules/metis/determinism-and-bounds.md)).

**The bounded platform-nondeterminism risk: parallel or out-of-order execution of independent cascade steps.** If two invalidated projections are independent, recomputing them on different threads is sound and the _result_ is identical; the risk is only that an implementation might let a non-deterministic _interleaving_ leak into a result (for example, a reduction that sums floating-point contributions in thread-completion order). The design bounds this the same way Metis bounds its analytics: any reduction whose result depends on order uses a stable, identifier-keyed order rather than completion order, so parallelism speeds the cascade without changing its answer. Where a step cannot be made order-independent cheaply, it stays sequential. The invariant the architecture holds is that **the cascade's output is a pure function of the op set and the viewpoint**, never of scheduling — the same property that lets a rebuild be _checked_ against the prior state rather than merely hoped equal ([ADR-0027](../06-adrs/ADR-0027-projection-consistency-model.md)).

---

## The trade-off named

The design buys interactive, history-independent reads and a portable, tamper-proof workspace at the cost of a **rebuild tax** that grows with op-log length, and a **whole-twin analytics ceiling** past which results are bounded or sampled rather than exact. It accepts both because the alternative — a mutable read model that is the source of truth — would forfeit the portability, the belief-pinned audit, and the deletability that the canonical-vs-derived split exists to guarantee ([canonical-vs-derived](./boundary/canonical-vs-derived.md)). Snapshot-plus-tail and incremental maintenance reduce the rebuild tax; sampling and bounding keep analytics within an interactive envelope; neither removes the underlying cost, and the design does not pretend they do. The door this closes: there is no configuration in which a 200k-entity twin yields exact whole-graph betweenness inside an interactive budget on a laptop — that answer is a bounded approximation, honestly labelled, or a hosted backend.

---

## References & standards

_Informative:_

- **arc42** template — the quality-scenario and building-block views this document extends.
- **ISO/IEC 25010** — performance efficiency and the scalability sub-characteristic this document scopes.
- Kleppmann — _Designing Data-Intensive Applications_, 2017. The read/write/rebuild cost trade-offs of log-structured derived data.

_Normative (referenced):_

- Gupta & Mumick — **Maintenance of Materialized Views**, 1995. The incremental-equals-rebuild and snapshot-equals-replay correctness conditions.

Full bibliography and the modules that use each source: [`../02-standards/STANDARDS-REGISTER.md`](../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                                                  | What it covers                                                            |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| [Quality attributes](./quality-attributes.md)                                             | The per-operation latency budgets (P1–P5) this document does not restate. |
| [Mneme performance budget](../05-modules/mneme/performance-budget.md)                     | The read/write/rebuild latency targets and the bounds behind them.        |
| [Metis algorithms and bounds](../05-modules/metis/algorithms-and-bounds.md)               | The analytics complexity bounds and the approximated/truncated states.    |
| [Derived runtime and projections](../05-modules/mneme/derived-runtime-and-projections.md) | The three consistency tiers and the cascade in detail.                    |
| [Op / fact / schema model](../05-modules/mneme/op-fact-schema-model.md)                   | Supersession-not-deletion and why the op log only grows.                  |
| [Export, import, and replay](../05-modules/mneme/export-import-replay.md)                 | Snapshot-plus-tail acceleration and its rebuild-equivalence condition.    |
| [ADR-0027](../06-adrs/ADR-0027-projection-consistency-model.md)                           | The projection consistency guarantee and cascade invalidation.            |
