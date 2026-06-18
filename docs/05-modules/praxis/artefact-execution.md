# Artefact execution

How Praxis executes an artefact at a viewpoint to produce an artefact result, the bounds every execution obeys, why the result is deterministic, and how results are cached and invalidated. For a reader implementing or consuming artefact execution.

The chain is `Artefact + Viewpoint → Artefact result` ([`CONTEXT.md`](../../../CONTEXT.md)). What an Artefact, result, family, and form are is the [artefacts design](../../03-design/artefacts/README.md); the durable execution decisions are [ADR-0033](../../06-adrs/ADR-0033-artefact-execution-model.md); this file is the execution mechanics inside Praxis.

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

## How a definition compiles to reads against the twin

An artefact definition is not executable code; it is declared content ([what an artefact is](../../03-design/artefacts/what-is-an-artefact.md), [ADR-0033](../../06-adrs/ADR-0033-artefact-execution-model.md)). Praxis compiles it into a bounded sequence of reads against the resolved twin at the viewpoint. The compilation is fixed, not free-form:

- **The scope compiles to a seed set.** A scope such as `type=Application` resolves, at the viewpoint, to the set of `Application` entities visible in that layer and scenario — the traversal's starting entities. A scope that names entities directly seeds from those entities.
- **The inclusion rules and family compile to a traversal plan.** The family fixes the question, so it fixes the canonical relationships to walk and the spine direction ([explainability](./explainability.md)): an application-portfolio question walks `realises` and `hosts`; a value-creation question walks `serves`. The traversal uses only the canonical relationships (`serves`, `realises`, `accesses`, `hosts`, `plan_effect` — [edge catalogue](./edge-catalogue/README.md)), bounded by the declared depth and fanout.
- **Slot enrichment compiles to per-element reads.** Each resolved entity and relationship is read for the slots the form needs — a catalogue reads the displayed columns, a matrix reads the cell relationship's metric slot.
- **The form compiles to the output shape.** Projection, aggregation, and the form's structure ([forms](../../03-design/artefacts/forms.md)) turn the resolved subgraph into the typed shape the renderer receives ([artefact results contracts](../../04-contracts/artefact-results/README.md)).

Every read in this sequence goes through the storage and temporal engines at the one viewpoint; Praxis owns the traversal semantics, [Mneme](../mneme/README.md) owns the reads ([artefact execution boundary](../../01-architecture/boundary/artefact-execution-boundary.md)). The renderer receives the compiled result, never the plan to recompute it.

## Result provenance — classification carried on results

Praxis establishes each element's [content classification](../../03-design/artefacts/content-classification.md) — **Asserted**, **Inferred**, or **Generated** ([Documentation Standard §9](../../02-standards/DOCUMENTATION-STANDARD.md)) — from the supporting facts, and carries it on the result so the renderer presents honest state without re-deriving it ([ADR-0033](../../06-adrs/ADR-0033-artefact-execution-model.md)). Classification is the kind-of-claim axis; it is distinct from the result state (Fresh, Stale, Bounded, …) and from [confidence](../../02-standards/DOCUMENTATION-STANDARD.md) ([ADR-0021](../../06-adrs/ADR-0021-confidence-and-trust-scale.md)), and a single element can carry all three.

| Source of the element                                                                                                          | Classification Praxis sets |
| ------------------------------------------------------------------------------------------------------------------------------ | -------------------------- |
| A slot or relationship resolved directly from a seeded or accepted fact                                                        | **Asserted**               |
| A roll-up, derived column, integrity score, or computed metric ([ADR-0020](../../06-adrs/ADR-0020-integrity-scoring-model.md)) | **Inferred**               |
| An LLM-drafted narrative or suggested mapping ([Sophia](../sophia/README.md), planned)                                         | **Generated**              |

The classification is per element, not per result: one catalogue row can hold an Asserted `disposition` and an Inferred health column. The renderer's display rules ([content classification](../../03-design/artefacts/content-classification.md)) key off the classification Praxis set; it never promotes Generated to Asserted, and acceptance is a separate human operation.

## Pagination, filter, and sort

A catalogue and any other list-shaped result is paginated, filtered, and sorted by Praxis at execution — the renderer does not re-slice a result locally ([artefact execution boundary](../../01-architecture/boundary/artefact-execution-boundary.md)). These options are execution parameters bound alongside the viewpoint ([ADR-0033](../../06-adrs/ADR-0033-artefact-execution-model.md)):

- **Filter** narrows which resolved elements appear, evaluated over slots Praxis read; it does not change the seed set's classification or the underlying facts.
- **Sort** orders the result by a named slot, with a deterministic tie-break by stable identifier so equal-keyed rows keep a reproducible order (see _Determinism_, below).
- **Pagination** returns one page of a list-shaped result. The catalogue page-size ceiling is 200 (see _Execution bounds_); a page carries the total count where it is bounded-cheap to compute, the current offset or cursor, and whether a further page exists. A result that paginates is not the same as a Bounded result: pagination is a complete result delivered in pages, while Bounded means a limit capped coverage and some content is absent by design. The contract carries both signals distinctly ([artefact results contracts](../../04-contracts/artefact-results/README.md)).

Filter, sort, and page values are part of the cache key together with the viewpoint, so two pages of the same query are two cache entries over one snapshot.

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

## Worked example — a paginated catalogue with mixed provenance

Execute the "Application Portfolio Health" catalogue artefact over the [baseline](../../data/base/baseline.yaml) at the viewpoint `{valid: 2026-06-11, asserted: latest, layer: actual, scenario: base, scope: type=Application}`, with sort by `name` ascending and page size 2.

1. **Compile to reads:** the scope `type=Application` resolves to the seed set `Insight Hub`, `Journey Studio`, `Automation Orchestrator`; the catalogue form reads each row's displayed slots and the `realises` relationships feeding a health roll-up.
2. **Classify per element:** each row's `disposition` and `lifecycle` are **Asserted** (seeded); the derived health column rolling up `realises` `criticality` is **Inferred** ([ADR-0020](../../06-adrs/ADR-0020-integrity-scoring-model.md)). A row therefore carries mixed classification.
3. **Sort and page:** sorted by `name`, the first page returns `Automation Orchestrator` and `Insight Hub`; the result reports total count 3, current offset 0, and that a further page exists. `Journey Studio` is on page 2 — absent from this page but not _missing_: the result is complete and paged, **not** Bounded.
4. **Return** the page with its rows, each row's per-element classification, the pagination fields, an integrity score ([integrity scoring](./integrity-scoring.md)), and all elements **Fresh**.

Asserting a new `realises` relationship from one of these applications invalidates the cached page; a second window reading the same page sees it **Stale** until recomputed, then converges to the state a full rebuild would produce ([ADR-0027](../../06-adrs/ADR-0027-projection-consistency-model.md)).

---

## Related documents

| Document                                                                                     | What it covers                                         |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| [Artefacts design](../../03-design/artefacts/README.md)                                      | What an Artefact, result, family, and form are.        |
| [ADR-0033](../../06-adrs/ADR-0033-artefact-execution-model.md)                               | The durable execution decisions this file realises.    |
| [Artefact results contracts](../../04-contracts/artefact-results/README.md)                  | The typed output shapes a renderer receives.           |
| [Artefact execution boundary](../../01-architecture/boundary/artefact-execution-boundary.md) | Why artefacts execute in Praxis, not the renderer.     |
| [Explainability](./explainability.md)                                                        | The spine traversal directions the pipeline uses.      |
| [Integrity scoring](./integrity-scoring.md)                                                  | The score attached to every result.                    |
| [ADR-0027](../../06-adrs/ADR-0027-projection-consistency-model.md)                           | The recompute-on-input-change model the cache follows. |
| [Projection and invalidation](../../04-contracts/projection-and-invalidation/README.md)      | The cross-module projection-validity contract.         |
| [`baseline.yaml`](../../data/base/baseline.yaml)                                             | The seed dataset the example uses.                     |
