# Artefact execution

How Praxis executes an artefact at a viewpoint to produce an artefact result, the bounds every execution obeys, why the result is deterministic, and how results are cached and invalidated. For a reader implementing or consuming artefact execution.

The chain is `Artefact + Viewpoint → Artefact result` ([`CONTEXT.md`](../../../CONTEXT.md)). What an Artefact, result, family, and form are is the [artefacts design](../../03-design/ARTEFACTS-AND-FAMILIES.md); this file is the execution mechanics inside Praxis.

---

## Where execution happens

Artefacts execute in Praxis, never in the renderer ([artefact execution boundary](../../01-architecture/boundary/artefact-execution-boundary.md)). Praxis resolves the twin at the [viewpoint](../../../CONTEXT.md), traverses the [effective graph](../../../CONTEXT.md) with the canonical relationships, applies the artefact's scope and inclusion rules, and returns a UI-ready result and diagram spec. The renderer renders the result; it does not resolve the twin or traverse the graph. This keeps traversal semantics in one place, behind a trait, so they cannot drift between the engine and the UI.

Every execution requires explicit context — the viewpoint is not a UI convenience but part of the operation contract: an as-of valid time, an as-of asserted time, a layer or layer policy, a scenario (or the base case), and a scope.

---

## The bounded pipeline

Execution follows a fixed, bounded pipeline:

```text
resolve the artefact definition at the viewpoint
  → resolve the seed set (scope)
    → traverse using the canonical relationships, up to the declared depth and fanout
      → enrich resolved entities and relationships with their slots
        → apply projection, aggregation, and the form's shape
          → attach integrity score and honest-state flags
            → return the artefact result
```

The traversal walks the semantic spine by default — a "why does this matter?" artefact walks _up_, an impact artefact walks _down_ ([explainability](./explainability.md)) — using `serves`, `realises`, `accesses`, `hosts`, and `plan_effect` ([edge catalogue](./edge-catalogue/README.md)).

---

## Execution bounds

Bounded execution is mandatory, not best-effort: every execution carries depth, size, fanout, and time limits, and a result that hits any of them is returned with the **Partial / Bounded** result state and explicit coverage, never silently truncated ([Documentation Standard §9](../../02-standards/DOCUMENTATION-STANDARD.md); [artefact execution boundary](../../01-architecture/boundary/artefact-execution-boundary.md)). The form-specific size ceilings are:

| Form       | Size bound                                  |
| ---------- | ------------------------------------------- |
| Graph view | at most 5,000 nodes and 10,000 edges        |
| Matrix     | at most 1,000 × 1,000 cells, sparse storage |
| Catalogue  | paginated, page-size ceiling 200            |

Depth and fanout bounds apply to every traversal regardless of form: a traversal that would exceed the declared depth, or fan out past the per-step limit, stops and marks the result Bounded. A time budget caps total execution; exceeding it returns whatever was computed, marked Bounded, rather than running unbounded.

The trade-off these bounds close: a single artefact cannot return an arbitrarily large slice of the twin in one execution. A genuinely large result is reached by narrowing scope or by paging, not by lifting the bound. The architecture accepts an occasional Bounded result in exchange for predictable latency and memory, and for a renderer that never has to defend against an unbounded payload.

---

## Determinism and seeding

An artefact result is deterministic: the same artefact, executed at the same viewpoint against the same snapshot, produces the same result. This rests on the snapshot being a resolved view of canonical facts ([`CONTEXT.md`](../../../CONTEXT.md), _Snapshot_), and on traversal having a fixed, ordered visitation rather than an ambient one. Where an ordering would otherwise be ambiguous — equal-ranked items, equal-weight paths — the tie-break is by stable identifier, so the order is reproducible. Where any analytic seeded by an artefact requires a random component (it does not today, but the contract anticipates it), the seed is part of the declared parameters and is recorded with the result, so a re-run reproduces it.

Determinism is what makes "view as-of last quarter" trustworthy: the artefact definition is stored as time-valid properties in Mneme, so a past viewpoint resolves the definition _and_ the data as they were, not as they are now.

---

## Caching and invalidation

An artefact result is **Inferred** content derived from a snapshot; it is cacheable, and it goes stale when its inputs change. Praxis does not invent its own freshness scheme — it follows the projection consistency model of [ADR-0027](../../06-adrs/ADR-0027-projection-consistency-model.md): a derived result is recomputed when a canonical input it depends on changes, and a cached result whose inputs have changed is presented as **Stale** until recomputed, or **Rebuilding** while recomputation is in flight ([Documentation Standard §9](../../02-standards/DOCUMENTATION-STANDARD.md)). A result is never silently served as fresh when its inputs have moved. The cache is keyed by the artefact identity and the viewpoint, so two viewpoints over one snapshot are two cache entries, consistent with one snapshot backing many results.

---

## Worked example — a graph view at a viewpoint

Execute a graph-view artefact seeded at `n:capability:customer-insight` from the [baseline](../../data/base/baseline.yaml), at the viewpoint: as-of valid time `2026-06-11`, as-of asserted time latest, layer `actual`, base case, scope = reachable within 3 hops.

1. **Resolve the definition** at the viewpoint and **resolve the seed set** to `Customer Insight`.
2. **Traverse** the canonical relationships within 3 hops: down inbound `realises` to `Insight Hub`, then `accesses` to `Customer Profile` and `hosts` from `Stream Processor`; up `serves` to `Discover`.
3. The resolved subgraph is five entities and four relationships — well within the 5,000-node / 10,000-edge bound, so the result is **not** Bounded.
4. **Enrich**: `serves` carries `confidence: 0.95`, `realises` carries `criticality: High`, `accesses` carries `mode: readwrite`.
5. **Return** the result with an integrity score ([integrity scoring](./integrity-scoring.md)) and honest-state flags — all elements **Fresh** and **Asserted** (seeded by the baseline commit).

Had the seed been a hub with thousands of inbound `realises` relationships, the traversal would stop at the fanout or 5,000-node bound and return a **Partial / Bounded** result naming the coverage it reached.

---

## Related documents

| Document                                                                                     | What it covers                                         |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| [Artefacts and families](../../03-design/ARTEFACTS-AND-FAMILIES.md)                          | What an Artefact, result, family, and form are.        |
| [Artefact execution boundary](../../01-architecture/boundary/artefact-execution-boundary.md) | Why artefacts execute in Praxis, not the renderer.     |
| [Explainability](./explainability.md)                                                        | The spine traversal directions the pipeline uses.      |
| [Integrity scoring](./integrity-scoring.md)                                                  | The score attached to every result.                    |
| [ADR-0027](../../06-adrs/ADR-0027-projection-consistency-model.md)                           | The recompute-on-input-change model the cache follows. |
| [Projection and invalidation](../../04-contracts/PROJECTION-AND-INVALIDATION.md)             | The cross-module projection-validity contract.         |
| [`baseline.yaml`](../../data/base/baseline.yaml)                                             | The seed dataset the example uses.                     |
