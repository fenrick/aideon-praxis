# Determinism and bounds

The deterministic input scope every Metis job declares, and how truncation, approximation, and warnings are serialised onto the result. For a reader who needs to reproduce a result or interpret its honest-state flags.

This describes **design intent** ([README](./README.md)); the obligations are normative and constrain the implementation when it lands.

---

## The deterministic input scope

Determinism is a hard invariant: given the same input, the same algorithm produces the same output ([README](./README.md)). The input is a declared triple, and nothing outside it influences the result:

1. a **workspace or partition boundary** — which twin, which slice;
2. an explicit **as-of valid time** and optional **scenario** — the viewpoint coordinates that fix which version of the twin is read ([`CONTEXT.md`](../../../CONTEXT.md), _Viewpoint_);
3. a **filtered graph projection or snapshot** — the resolved input graph.

No job reads ambient mutable state, wall-clock time, or any non-deterministic source. Where an algorithm needs an ordering that the data leaves ambiguous — equal PageRank scores, equal-weight shortest paths — the tie-break is by stable identifier, so the order is reproducible rather than dependent on iteration order or floating-point happenstance.

### Temporal path constraints

Path and reachability jobs respect the viewpoint's temporal frame: a path may only traverse relationships whose [effective interval](../../../CONTEXT.md) covers the as-of valid time. A relationship that is not in effect at the viewpoint is not an edge in the input graph. This keeps a path answer consistent with the snapshot it was computed over — a dependency that does not yet hold (a planned `plan_effect`) does not appear in an `actual`-layer path, and a closed relationship does not appear after its valid-to.

### Numerical stability

Iterative scores are made stable so determinism holds across platforms: PageRank applies a fixed damping factor and normalises its score vector, and convergence is tested against a fixed tolerance. Score comparisons that feed a ranking break ties by identifier, so two runs over the same input produce byte-identical order.

---

## Serialising honest state

Every result envelope carries the execution facts, never suppressing them ([README](./README.md)):

| Field                     | What it records                                                                                                                                                                |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Truncation flags**      | The output was bounded to stay within a memory, size, or time limit — which limit, and the coverage reached ([algorithms and bounds](./algorithms-and-bounds.md))              |
| **Approximation markers** | A bounded approximation was used instead of exact computation — which algorithm, the sample size or iteration cap                                                              |
| **Warnings**              | Input quality, coverage, or completeness affected confidence — for example, a below-threshold integrity gate on the seed ([integrity scoring](../praxis/integrity-scoring.md)) |
| **Algorithm parameters**  | The declared parameters the job ran under — algorithm, damping, tolerance, depth/fanout caps, seed — for reproducibility                                                       |

These map to the honest-state result states of [Documentation Standard §9](../../02-standards/DOCUMENTATION-STANDARD.md): a truncated result is **Partial / Bounded**; a result whose projection has since changed is **Stale** ([ADR-0027](../../06-adrs/ADR-0027-projection-consistency-model.md)); a job still running is **In progress**.

Confidence ([ADR-0021](../../06-adrs/ADR-0021-confidence-and-trust-scale.md)) qualifies the result; a bounded or approximated result is reported with a lower confidence label, distinct from the integrity of the underlying content ([integrity scoring](../praxis/integrity-scoring.md)). A high-integrity subgraph can still yield a low-confidence result if the analysis was bounded.

---

## Job isolation

Jobs are isolated: one analytics job's bounded execution and resource budget do not affect another's, and a job that exhausts its budget halts itself without starving the queue ([accepted-work execution](./accepted-work-execution.md)). A failed job returns its partial results with explicit coverage rather than corrupting a shared state, because results are derived and write nothing canonical.

---

## Worked example — a reproducible centrality run

A PageRank ranking over the [baseline](../../data/base/baseline.yaml) at viewpoint as-of `2026-06-11`, `actual` layer, base case, declares its parameters: damping `0.85`, tolerance `1e-6`, max iterations `100`. The job converges in a few iterations on the small graph, so no approximation marker is set; all relationships are in effect at the viewpoint, so the temporal constraint excludes nothing; ties are broken by identifier. Re-running the job with the identical input triple and parameters produces an identical ranking. Changing only the as-of valid time to before `2026-05-01` would exclude the `plan_effect` relationships dated then — a different input graph, and legitimately a different (still reproducible) result.

---

## Related documents

| Document                                                                         | What it covers                                   |
| -------------------------------------------------------------------------------- | ------------------------------------------------ |
| [Algorithms and bounds](./algorithms-and-bounds.md)                              | The algorithms whose limits produce these flags. |
| [Accepted-work execution](./accepted-work-execution.md)                          | The job lifecycle and isolation.                 |
| [ADR-0027](../../06-adrs/ADR-0027-projection-consistency-model.md)               | When a result goes stale.                        |
| [ADR-0021](../../06-adrs/ADR-0021-confidence-and-trust-scale.md)                 | The confidence label a bounded result carries.   |
| [Projection and invalidation](../../04-contracts/PROJECTION-AND-INVALIDATION.md) | How the input projection stays valid.            |
| [`baseline.yaml`](../../data/base/baseline.yaml)                                 | The seed dataset the example uses.               |
