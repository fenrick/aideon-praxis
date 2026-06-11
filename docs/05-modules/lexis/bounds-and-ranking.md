# Bounds and ranking

How Lexis caps a query, marks an incomplete result, and orders hits — and why a ranking score is not a trust signal. For practitioners reasoning about result completeness and how search relevance relates to the product's integrity and confidence scales.

> **PLANNED.** No `aideon_lexis` crate exists; this is design intent per [ADR-0012](../../06-adrs/ADR-0012-search-and-discovery-lexis.md).

## Every query is bounded

A fanout, depth, or size limit caps every Lexis query ([ADR-0012](../../06-adrs/ADR-0012-search-and-discovery-lexis.md)). A query over a large twin must not run unbounded: it returns the top-ranked hits up to the cap, and a capped result is marked **`Partial / Bounded`** — coverage is incomplete by design ([Documentation Standard §9](../../02-standards/DOCUMENTATION-STANDARD.md)). Lexis must not silently return an incomplete answer as if it were complete; the boundedness travels with the result so the reader knows there may be more beyond the cap.

This is the same bounded-and-honest discipline Metis applies to graph computation ([Metis algorithms and bounds](../metis/algorithms-and-bounds.md)): a limit is declared, a hit on the limit is reported, and the result carries the fact that it was capped.

## Result state, not a single badge

A Lexis result can carry several states at once, drawn from the honest-state vocabulary ([Documentation Standard §9](../../02-standards/DOCUMENTATION-STANDARD.md)):

| State                 | When Lexis sets it                                                                                               |
| --------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Fresh**             | Computed against a current index with no known staleness.                                                        |
| **Stale**             | A canonical input changed since the index was built (see [viewpoint-aware search](./viewpoint-aware-search.md)). |
| **Rebuilding**        | The index is recomputing; the shown result is a prior snapshot.                                                  |
| **Partial / Bounded** | A fanout, depth, or size cap truncated the result.                                                               |

These do not collapse into one badge. A result may be both `Bounded` (the cap was hit) and `Stale` (the index lags), and the reader sees both.

## Ranking orders results — it is not trust

A ranking score orders hits by relevance and **nothing more** ([ADR-0012](../../06-adrs/ADR-0012-search-and-discovery-lexis.md)). It must not be read as, conflated with, or rendered as:

- an **integrity score** ([ADR-0020](../../06-adrs/ADR-0020-integrity-scoring-model.md)) — which scores how well-founded model content is, across completeness, connectivity, recency, consistency, and corroboration; or
- a **confidence band** ([ADR-0021](../../06-adrs/ADR-0021-confidence-and-trust-scale.md)) — which qualifies how much a derived result should be relied upon.

A highly-ranked hit is the best lexical or semantic match for the query terms; it says nothing about whether the matched content is well-founded or whether any analysis over it is reliable. Keeping these scales separate is what stops a search box from quietly becoming a trust oracle. Whether semantic relevance should ever be presented using the confidence vocabulary, or a distinct search-only scale, is an open question in [ADR-0012](../../06-adrs/ADR-0012-search-and-discovery-lexis.md); until it is settled, ranking stays its own thing.

## The trade-off, stated

Caps bound latency and memory at the cost of recall: a query that hits the size cap may leave a relevant hit unreturned, which is why the `Bounded` state exists rather than a silent truncation. Local-model ranking bounds relevance quality, which is the cost of the offline posture ([full-text and semantic](./full-text-and-semantic.md)). Both costs are surfaced to the reader rather than hidden.

## Worked example

A reader searches for "service" at a viewpoint, with a size cap of 50. The twin holds 200 matching entities. Lexis returns the 50 highest-ranked hits — for instance the `Application` `n:application:insight-hub` and the `Capability` `n:capability:journey-orchestration` near the top by lexical and semantic match — and marks the result `Partial / Bounded`. The ranking puts the closest matches first; it does **not** imply that "Insight Hub" is higher-integrity or that any impact analysis over it is higher-confidence. Those are separate questions answered by Praxis integrity scoring and Metis confidence, not by Lexis.

## References & standards

_Informative:_

- Lewis et al. — **Retrieval-Augmented Generation**, 2020. Bounded retrieval is the input Sophia grounds on.

Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                         | What it covers                                          |
| ---------------------------------------------------------------- | ------------------------------------------------------- |
| [Lexis README](./README.md)                                      | The module index and invariants.                        |
| [Viewpoint-aware search](./viewpoint-aware-search.md)            | The viewpoint scoping that runs before the cap.         |
| [ADR-0020](../../06-adrs/ADR-0020-integrity-scoring-model.md)    | The integrity scale ranking must not be confused with.  |
| [ADR-0021](../../06-adrs/ADR-0021-confidence-and-trust-scale.md) | The confidence scale ranking must not be confused with. |
