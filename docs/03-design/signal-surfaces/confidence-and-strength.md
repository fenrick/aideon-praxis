# Confidence and strength

How a signal expresses how much it should be relied upon, and why that is not the same as the integrity of the model
content it reasons over. This page references the unified scales; it does not redefine them.

---

## Strength is confidence

A signal's **strength** is its [confidence](../../02-standards/DOCUMENTATION-STANDARD.md), the quality scale set by
[ADR-0021](../../06-adrs/ADR-0021-confidence-and-trust-scale.md) (§8.2). It is presented as an ordinal label with its
defined band, optionally with the underlying number:

| Label          | Band        |
| -------------- | ----------- |
| **High**       | `≥ 0.85`    |
| **Medium**     | `0.60–0.85` |
| **Low**        | `0.30–0.60` |
| **Indicative** | `< 0.30`    |

A signal **must not** present strength as unqualified certainty. The bands are normative and identical across the
corpus; this page reuses them and does not invent its own tiers.

## What kind of basis the signal has

Strength alone does not say what _kind_ of thing produced the number. A signal **must** also declare its basis, because
a user reads a hard rule and a heuristic flag differently even at the same confidence:

| Basis                   | Meaning                                                                                      | How confidence behaves                                                                          |
| ----------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **Hard rule**           | A deterministic condition is met or not met (a cardinality breach, a missing required slot). | Confidence is effectively High by construction; the question is only whether the rule fired.    |
| **Probabilistic score** | A bounded computation yields a number — a concentration score, an anomaly likelihood.        | Confidence reflects the score and any bounding; report the band and, where useful, the value.   |
| **Heuristic flag**      | A rule-of-thumb pattern match without a calibrated probability.                              | Confidence is usually Low or Indicative; the signal is a prompt to look, not a basis to decide. |

## Confidence is not integrity

Two distinct scales, deliberately kept apart:

- **Confidence** qualifies _a result or signal_ — how much to rely on this output
  ([ADR-0021](../../06-adrs/ADR-0021-confidence-and-trust-scale.md), §8.2).
- **Integrity** scores _the model content_ — how well-founded an entity, relationship, artefact result, or subgraph is,
  across five dimensions (completeness, connectivity, recency, consistency, corroboration), computed by Praxis per
  [ADR-0020](../../06-adrs/ADR-0020-integrity-scoring-model.md) (§8.1).

A high-integrity subgraph can still yield a low-confidence signal if the analysis over it was bounded or approximated; a
low-integrity subgraph can produce a hard-rule warning at High confidence that the content is broken. A signal surface
keeps both legible and never merges them into one badge.

## Worked example

Two seed inputs, two readings:

- The `serves` relationship from `Customer Insight` to the Discover stage (`e:capability-serves-discover`) carries
  `confidence: 0.95`. On the confidence scale that is **High** — a well-corroborated relationship, safe to rely on
  within scope. A signal citing it inherits that strength.
- The plan event `FY26 Insight Modernization` (`n:plan-event:fy26-modernization`) carries `confidence: 0.7`. That is
  **Medium** — usable with awareness of its caveats. A Chrona scenario-divergence signal built on this plan event
  reports Medium strength and names the plan event as the caveat-bearing input.

Note the separation: `Insight Hub`'s integrity score (does it have its expected slots and relationships, are its facts
recent, do they pass validation) is computed by Praxis and is a different number from the 0.7 confidence on the plan
that touches it.

## References & standards

_Normative:_

- [ADR-0021](../../06-adrs/ADR-0021-confidence-and-trust-scale.md), Confidence and trust scale — the strength labels and
  bands.
- [ADR-0020](../../06-adrs/ADR-0020-integrity-scoring-model.md), Integrity scoring model — the five-dimension content
  score.

## Related documents

| Document                                                                  | What it covers                                        |
| ------------------------------------------------------------------------- | ----------------------------------------------------- |
| [required-elements.md](./required-elements.md)                            | Strength as one of the six required elements.         |
| [signal-families.md](./signal-families.md)                                | How each family declares its inputs and basis.        |
| [DOCUMENTATION-STANDARD.md](../../02-standards/DOCUMENTATION-STANDARD.md) | The unified scales (§8.1 integrity, §8.2 confidence). |
| [trust-and-honesty.md](../trust-and-honesty.md)                           | Why confidence and integrity stay distinct on screen. |
