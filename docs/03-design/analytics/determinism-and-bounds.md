# Determinism and bounds

A Metis result is only worth showing if a reader can trust where it came from and what its limits are. This document sets out the two properties that make that trust possible: every result is deterministic with respect to its inputs, and every result declares its own bounds and provenance in the envelope rather than burying them in a log file.

> **Implementation status.** The `metis` crate is a placeholder; the determinism and bounds rules here are **design intent** and constrain the engine when it lands. See the [Metis module README](../../05-modules/metis/README.md).

---

## Determinism with respect to the input snapshot

Every Metis result must be deterministic with respect to its input snapshot and its algorithm parameters. Given the same workspace boundary, the same viewpoint (as-of valid time, as-of asserted time, layer policy, scenario, scope), the same filtered projection, and the same declared algorithm with the same parameters, the same answer comes back — the same ranks, the same scores, the same impact set, the same paths.

This follows from a single rule: **no non-deterministic input is permitted.** A job must not read the wall clock for anything that affects the result, must not depend on iteration order over an unordered collection, must not consult ambient mutable state, and must not call a random or external source. Where an algorithm is iterative (for example, PageRank power iteration _(Page & Brin, 1998)_), it runs to a declared, fixed convergence criterion or iteration cap so two runs over the same input agree exactly.

The trade-off is explicit. Pinning every input means a result cannot quietly improve as the world moves on — it reflects exactly the snapshot it was computed against and nothing newer. That is the price of reproducibility, and it is the property that makes staleness detectable rather than invisible.

---

## Bounds surface in the envelope

A bounded result that does not say it is bounded is a lie of omission. Metis declares its limits in the result envelope, not in log output, so that artefacts, signal surfaces, and inspectors can show them next to the number.

- **Truncation** — when a graph walk or a ranked list is cut at a fanout, depth, size, or time limit, the envelope's `bounds` records the limit that fired and `truncated` is set. Coverage is incomplete by design, and the result carries the **Partial / Bounded** result state ([§9](../../02-standards/DOCUMENTATION-STANDARD.md)).
- **Approximation** — when an algorithm returns an estimate rather than an exact value, the envelope marks the method and the estimate's quality, expressed through the [confidence scale (§8.2)](../../02-standards/DOCUMENTATION-STANDARD.md). An approximated betweenness over a large graph is **Medium** or **Low** confidence, never silently presented as exact.
- **Warnings** — when input is sparse, disconnected, or borderline for the declared algorithm, the envelope carries a `warnings[]` entry describing the condition. A centrality run over a near-empty scope warns rather than returning a confident-looking zero.

A reader never has to open a log to learn that a result was capped or estimated. The envelope says so, and the surface that renders it shows so.

---

## Derived, never canonical

A Metis result is **Inferred** content ([§9](../../02-standards/DOCUMENTATION-STANDARD.md)): derived by declared computation, traceable to its inputs, and reconsidered when those inputs change. It is never written back as canonical model state. A ranking, a score, or an impact set is a view of the model at the instant it was computed; it does not become a fact, does not overwrite an authored slot, and does not enter the op log as truth.

Because a result is pinned to a snapshot, it goes **Stale** ([§9](../../02-standards/DOCUMENTATION-STANDARD.md)) the moment a canonical input behind that snapshot changes — it is not recomputed silently and does not update in place. Any consumer that persists a result (a saved artefact, a cached dashboard tile) must record the provenance triple **`(viewpoint, algorithm, computed_at)`** so staleness is detectable: compare the stored `computed_at` against the latest change to the projection it read, and the result either holds or is due for re-evaluation. While a re-evaluation is running, the prior result is shown with the **Rebuilding** state until the fresh one lands.

The confidence and integrity scales that qualify these results are fixed elsewhere and referenced, never redefined here: confidence qualifies the result ([§8.2](../../02-standards/DOCUMENTATION-STANDARD.md)), integrity scores the model content the result was computed over ([§8.1](../../02-standards/DOCUMENTATION-STANDARD.md)). A high-integrity subgraph can still yield a low-confidence result if the run was bounded or approximated.

---

## Explainability

Metis does not return a bare number and stop. Every result carries enough supporting structure for Praxis to explain it in domain language ([Praxis](../../05-modules/praxis/README.md) owns that translation; Metis supplies the structure):

- **contributing nodes** — the entities or relationships that drove a ranking or a score, carried in `contributing_ids[]`;
- **supporting paths** — the chains that produced an impact result, carried in `path_sample[]`;
- **affected sets** — the impacted entities with their relationship and depth from the source;
- **parameters** — the algorithm, its parameters, the input snapshot reference, and the timing, carried in the execution summary.

This is the evidence on which explanation rests. A score with no contributing structure is not explainable, so Metis does not produce one.

---

## Worked example — staleness of a saved centrality result

A user saves a centrality ranking over the seed graph ([`baseline.yaml`](../../data/base/baseline.yaml)) at the base-case actual viewpoint. The saved envelope records `algorithm = pagerank`, `computed_at = 2026-06-11T09:00:00Z`, and the viewpoint. At that moment the result is **Fresh**.

The `FY26 Q2 Channel Cutover` plan event (`n:plan-event:fy26-channel-cutover`, `effective_at` `2026-05-01`) is then accepted into the actual layer, adding a `realises` link affecting `n:application:journey-studio`. The projection the saved result read has changed, so the stored `computed_at` is now older than the latest projection change for that scope: the saved ranking is **Stale**. The surface showing it marks it stale and offers re-evaluation; it does not silently substitute a new ranking under the old timestamp, because that would erase the provenance that made the staleness visible.

---

## References & standards

_Normative:_

- Page & Brin — **PageRank**, 1998. Iterative computation run to a fixed convergence criterion for determinism.
- Dijkstra, 1959; Bellman–Ford — shortest paths, deterministic given a fixed tie-break order.

_Informative:_

- Mitchell et al. — **Model Cards for Model Reporting**, 2019. Disclosure of a result's limitations alongside the result.

Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md). The honest-state result vocabulary and the confidence/integrity scales are fixed by the [Documentation Standard §8, §9](../../02-standards/DOCUMENTATION-STANDARD.md) and not redefined here.

## Related documents

| Document                                                                      | What it covers                                                               |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| [metis-analytics.md](./metis-analytics.md)                                    | What Metis computes and the result envelopes that carry these bounds.        |
| [trust-and-honesty.md](../trust-and-honesty.md)                               | The product's honesty obligations and how results declare their state.       |
| [Metis module README](../../05-modules/metis/README.md)                       | Algorithm selection, complexity, and the engine-level determinism rules.     |
| [CONTRACTS-AND-SCHEMAS.md](../../04-contracts/CONTRACTS-AND-SCHEMAS.md)       | The typed `bounds`, `warnings`, and provenance fields.                       |
| [Documentation Standard §8, §9](../../02-standards/DOCUMENTATION-STANDARD.md) | The confidence/integrity scales and honest-state vocabulary referenced here. |
