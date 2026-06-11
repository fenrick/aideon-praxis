# Explainable evidence

The evidence Metis returns with every result — contributing nodes and paths — and the sampling rule that keeps evidence honest on huge graphs. For a reader consuming Metis output or building a surface that drills into it.

This describes **design intent** ([README](./README.md)).

---

## Results carry their evidence

A Metis result is structured, not a bare number. Each output carries the evidence that supports it, so the rest of the product can present it defensibly ([what Metis computes](./what-metis-computes.md)):

- **ranked items** carry their score and their **top contributing factors** — the relationships and neighbours that drove the rank;
- **impact sets** carry the **supporting dependency paths** — how each affected entity was reached;
- **path bundles** carry the **node and relationship sequences** that make up each path;
- every result carries its **algorithm metadata and execution timing** for reproducibility ([determinism and bounds](./determinism-and-bounds.md)).

This evidence is what Praxis presents in an explanation — top inbound contributors, top dependency paths, affected-entity sets ([explainability](../praxis/explainability.md)). Praxis frames the question and presents the answer; Metis supplies the computed contributors. The two do not duplicate the computation.

---

## The sampling rule for huge graphs

On a large graph, returning _every_ contributor or path would itself be unbounded and would swamp the consumer. The rule is to return a **bounded, ranked sample** of the evidence rather than all of it, and to say so:

- evidence is **ranked** by contribution (the relationships that most moved a score, the shortest or highest-weight paths) and the **top-k** are returned;
- when the full evidence set was larger than the returned sample, the result is marked — the consumer knows it is seeing the strongest evidence, not the whole of it;
- the sample is **deterministic**: the same input yields the same top-k, because ranking ties break by identifier ([determinism and bounds](./determinism-and-bounds.md)).

This mirrors the sampled-source approximation used for betweenness on large graphs ([algorithms and bounds](./algorithms-and-bounds.md)): the computation and its evidence are both bounded, and both say when they were sampled. The trade-off: a consumer cannot assume the returned evidence is exhaustive on a large graph — but it can trust that it is the strongest, ranked, and reproducible, which is what an explanation needs.

---

## Worked example — evidence for an impact set

The downstream impact set from `n:application:automation-orchestrator` ([baseline](../../data/base/baseline.yaml)) returns three affected entities, each with its supporting path:

- **Automation Fabric** — path `Automation Orchestrator —realises→ Automation Fabric`;
- **Engagement Event** — path `Automation Orchestrator —accesses(readwrite-or-read)→ Engagement Event`;
- **Stream Processor** — path `Stream Processor —hosts→ Automation Orchestrator` (inbound).

On this small baseline the full evidence set fits, so nothing is sampled and the result is not marked. On a twin where Automation Orchestrator was reached by thousands of `hosts` relationships, the impact set would return the top-k contributing paths ranked by weight, mark the evidence as sampled, and remain reproducible across runs.

---

## Related documents

| Document                                               | What it covers                                     |
| ------------------------------------------------------ | -------------------------------------------------- |
| [Praxis — explainability](../praxis/explainability.md) | How this evidence is presented as an explanation.  |
| [What Metis computes](./what-metis-computes.md)        | The families whose results carry this evidence.    |
| [Determinism and bounds](./determinism-and-bounds.md)  | Why the sample is reproducible.                    |
| [Algorithms and bounds](./algorithms-and-bounds.md)    | The sampled-source approximation for large graphs. |
| [Model cards](./model-cards.md)                        | Disclosure for ML-derived contributors.            |
| [`baseline.yaml`](../../data/base/baseline.yaml)       | The seed dataset the example uses.                 |
