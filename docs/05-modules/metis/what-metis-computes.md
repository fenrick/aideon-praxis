# What Metis computes

The families of computation Metis owns — centrality, impact, paths, and cost — and what each answers. For a reader deciding which family fits a question. The named algorithms and their complexity are in [algorithms and bounds](./algorithms-and-bounds.md); this file is the catalogue of capabilities.

This describes **design intent**: the families and their result shapes are specified here; the engine that runs them is not yet implemented ([README](./README.md)).

---

## The families

| Family                      | Representative jobs                                                         | The question it answers                                                                                  |
| --------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Centrality and ranking**  | PageRank-style node scoring, concentration analysis, hotspot identification | Which entities are structurally most important, and where is importance concentrated?                    |
| **Impact and blast radius** | Upstream/downstream impact sets, dependency spread                          | What does a change to this entity reach, and how far?                                                    |
| **Path and reachability**   | Shortest paths, reachability queries, dependency chains                     | How does one entity depend on another, and by what route?                                                |
| **Cost and optimisation**   | Total-cost-of-ownership rollups, scenario-sensitive comparisons             | What does an entity or scenario cost to run, and how do two compare? ([cost and TCO](./cost-and-tco.md)) |
| **Risk and diagnostics**    | Concentration risk, structural weak points                                  | Where is the twin structurally fragile?                                                                  |
| **Temporal summaries**      | Change summaries across time or scenario                                    | What changed between two viewpoints, and how much?                                                       |

Each family is a typed surface — ranked items with scores and contributing factors, impact sets with supporting paths, path bundles with node and relationship sequences — not a free-form blob. The evidence each carries is in [explainable evidence](./explainable-evidence.md).

---

## What every family shares

Three properties hold across all of them, and are invariants ([README](./README.md)):

- **Computed at a viewpoint.** Every job declares its input: a workspace or partition boundary, an explicit as-of valid time and optional scenario, and a filtered graph projection ([determinism and bounds](./determinism-and-bounds.md)). The result carries the viewpoint it was computed at.
- **Inferred, never canonical.** A result is a view, recomputed when its projection is invalidated ([ADR-0027](../../06-adrs/ADR-0027-projection-consistency-model.md)); it never updates entity state.
- **Bounded and flagged.** Every result carries truncation flags, approximation markers, and warnings where input quality affected it ([algorithms and bounds](./algorithms-and-bounds.md)).

---

## What reads the families

| Consumer              | Family it relies on                                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Praxis explainability | Centrality and impact — top contributors and dependency paths ([explainability](../praxis/explainability.md))             |
| Kairos (planned)      | Impact — the blast-radius component of change magnitude ([impact and change magnitude](./impact-and-change-magnitude.md)) |
| Signal surfaces       | Centrality, risk diagnostics — hotspots and concentration ([SIGNAL-SURFACES.md](../../03-design/SIGNAL-SURFACES.md))      |
| Artefacts and reports | All — scored tables, impact graphs, cost summaries ([artefacts](../../03-design/ARTEFACTS-AND-FAMILIES.md))               |

Metis gives these surfaces something defensible to show; it does not own their layout or workflow UX.

---

## Worked example — ranking capabilities by structural importance

Over the [baseline](../../data/base/baseline.yaml), a centrality job ranks the three capabilities — `Customer Insight`, `Journey Orchestration`, `Automation Fabric` — by their position in the resolved graph. Importance flows along the canonical relationships: a capability is more central when more applications `realises` it and it `serves` more value-stream stages. In the small baseline each capability serves exactly one stage and is realised by one application, so the ranking is driven by their wider connectivity and the relationship weights (`serves.confidence`, `realises.criticality`). The result is a ranked list, each item carrying its score and its top contributing relationships ([explainable evidence](./explainable-evidence.md)) — not a bare number.

---

## Related documents

| Document                                                        | What it covers                                                   |
| --------------------------------------------------------------- | ---------------------------------------------------------------- |
| [Algorithms and bounds](./algorithms-and-bounds.md)             | The named algorithms behind these families and their complexity. |
| [Impact and change magnitude](./impact-and-change-magnitude.md) | The impact family in detail and its use by Kairos.               |
| [Cost and TCO](./cost-and-tco.md)                               | The cost family and the folded FinOps concern.                   |
| [Explainable evidence](./explainable-evidence.md)               | The evidence each family's result carries.                       |
| [`baseline.yaml`](../../data/base/baseline.yaml)                | The seed dataset the example uses.                               |
