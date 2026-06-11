# Viewpoint-aware search

Why a search in a time-first twin must carry a viewpoint, and how Lexis handles an index that lags canonical truth. For practitioners reasoning about search correctness across time, layers, and scenarios.

> **PLANNED.** No `aideon_lexis` crate exists; this is design intent per [ADR-0012](../../06-adrs/ADR-0012-search-and-discovery-lexis.md).

## A search without a viewpoint is a correctness defect

The twin is bitemporal and scenario-aware ([ADR-0009](../../06-adrs/ADR-0009-temporal-model-valid-interval-layer-policy-viewpoint.md)). An entity exists or does not exist **relative to a viewpoint** — an as-of valid time, an as-of asserted time, a layer or layer policy, a scenario, and a scope. A search that ignores the viewpoint returns entities that do not exist at the reader's frame: a tombstoned application, a plan-only entity surfaced in an actual-only view, an entity from a scenario the reader did not select. This is a correctness defect, not a ranking quirk ([ADR-0012](../../06-adrs/ADR-0012-search-and-discovery-lexis.md)).

So **every Lexis query carries a `Viewpoint`** and returns only content resolvable at it. The index is the fast path to _candidates_; the viewpoint decides which candidates are _real_ for this reader.

## Lexis resolves candidacy, it does not own existence

Lexis must not maintain a parallel notion of existence. It resolves candidacy through the same temporal rules the resolver uses, deferring to Chrona viewpoint resolution rather than baking "what exists now" into the index ([ADR-0012](../../06-adrs/ADR-0012-search-and-discovery-lexis.md)). An index entry is a pointer to a slot or entity; whether that pointer is live at the query's viewpoint is a resolution question, answered the same way the rest of the product answers it. This keeps Lexis honest when the temporal rules evolve: the index does not encode a frozen opinion about existence that the resolver could later contradict.

## Honest state when the index lags

Because the indexes are derived and rebuilt in batches ([full-text and semantic](./full-text-and-semantic.md)), they can lag canonical truth between rebuilds. Lexis does not hide this:

- A result computed against a recomputing index is marked **`Rebuilding`** — the shown result is a prior snapshot.
- A result a freshness check finds out of date against the projection contract is marked **`Stale`** — a canonical input changed since the index was built.

Stale and rebuilding results are **badged, not hidden** ([ADR-0012](../../06-adrs/ADR-0012-search-and-discovery-lexis.md); [Documentation Standard §9](../../02-standards/DOCUMENTATION-STANDARD.md)). The reader sees the result _and_ the warning that it may not reflect the latest operations, and can trigger a rebuild. Suppressing a stale result would be the dishonest choice; presenting it without its state would be worse.

## Worked example

A reader searches for "Payments" at a viewpoint pinned to an as-of valid time in 2024, actual layer, base case (no scenario). The full-text index holds a candidate for the `Application` named "Payments Service". Lexis returns it **only if** a fact places that application before the as-of valid time in the actual layer. If the application exists only as a `plan` — for instance dated by a `PlanEvent` for a future cutover — it appears solely when the viewpoint selects the plan layer or a scenario carrying it, never in the 2024 actual-layer search ([ADR-0012](../../06-adrs/ADR-0012-search-and-discovery-lexis.md)).

Against the seed: searching for "Automation" at the actual layer returns the `Application` `n:application:automation-orchestrator` ("Automation Orchestrator", `disposition = Migrate`) if a fact places it in the actual layer at the as-of valid time. A plan-layer migration target dated by a future `PlanEvent` appears only when the viewpoint selects that plan or scenario. If the index is mid-rebuild when the query runs, the same hit returns marked `Rebuilding`.

## References & standards

_Informative:_

- Snodgrass — _Developing Time-Oriented Database Applications in SQL_, 1999. The bitemporal semantics candidacy resolution honours.

Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                                                   | What it covers                                                   |
| ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| [Lexis README](./README.md)                                                                | The module index and invariants.                                 |
| [Bounds and ranking](./bounds-and-ranking.md)                                              | The caps and result state that ride alongside viewpoint scoping. |
| [TEMPORAL-AND-SCENARIO-CONTEXT.md](../../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md)    | The viewpoint frame and resolution rules Lexis defers to.        |
| [ADR-0009](../../06-adrs/ADR-0009-temporal-model-valid-interval-layer-policy-viewpoint.md) | The temporal model that makes existence viewpoint-relative.      |
