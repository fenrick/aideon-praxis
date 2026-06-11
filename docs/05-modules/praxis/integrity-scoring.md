# Integrity scoring

How Praxis scores how well-founded a piece of modelled content is: the five dimensions, the weights, the gate threshold, and a worked score. For a reader implementing or consuming integrity. The score's definition is fixed by [ADR-0020](../../06-adrs/ADR-0020-integrity-scoring-model.md) and [Documentation Standard §8.1](../../02-standards/DOCUMENTATION-STANDARD.md); this file records how Praxis computes and applies it, and does not redefine it.

---

## What the score is

An **integrity score** is a number in `[0.0, 1.0]` that Praxis computes for an entity, relationship, artefact result, or subgraph, expressing how well-founded the modelled content is. It is **Inferred** content ([`CONTEXT.md`](../../../CONTEXT.md)) — derived by declared rule from canonical material, traceable to its inputs, and recomputed when those inputs change ([ADR-0027](../../06-adrs/ADR-0027-projection-consistency-model.md)). It is never Asserted, never authored, and never silently promoted to a claim.

Integrity scores the _model content_; [confidence](../../02-standards/DOCUMENTATION-STANDARD.md) ([ADR-0021](../../06-adrs/ADR-0021-confidence-and-trust-scale.md)) qualifies a _result derived from it_. The two are distinct axes — a high-integrity subgraph can still yield a low-confidence analytic result if the analysis was bounded.

> The five-dimension model below supersedes the earlier Praxis integrity vocabulary (directionality / logical-physical separation / spine completeness / orphan rate / conflict density). [ADR-0020](../../06-adrs/ADR-0020-integrity-scoring-model.md) is now the single definition; the dimensions here are §8.1 verbatim.

---

## The five dimensions

| Dimension         | The question it scores                                                                             | What Praxis reads                                                                                                                                                 |
| ----------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Completeness**  | Are the slots and relationships the metamodel _and the semantic spine_ expect actually present?    | The compiled effective schema's required slots, and the spine's expected links for the entity's role ([semantic spine](../../03-design/semantic-spine/README.md)) |
| **Connectivity**  | Is the content reachable along the expected spine, with no orphan where the spine requires a link? | The presence of the expected spine relationships; an `Application` that realises nothing is an orphan at the Technology→Capability link                           |
| **Recency**       | How fresh are the supporting facts against the freshness policy for their type?                    | The asserted/valid time of supporting facts against the per-type freshness policy                                                                                 |
| **Consistency**   | Does the content violate any effective-schema validation rule or cardinality constraint?           | The [validation rules](../../03-design/metamodel/validation-rules.md) — enum membership, endpoint constraints, self/duplicate rules, cardinality                  |
| **Corroboration** | Is there evidence — a source, an import lineage, an accepted Change Event — behind the claims?     | The provenance carried by the supporting operations                                                                                                               |

Completeness and Connectivity read the spine directly; Recency, Consistency, and Corroboration do not ([how the spine drives integrity and explainability](../../03-design/semantic-spine/how-the-spine-drives-integrity-and-explainability.md)). The spine is the structural backbone of the score, not the whole score.

Each dimension yields a sub-score in `[0.0, 1.0]`.

---

## Weights and the gate threshold

The composite is a **weighted mean** of the five sub-scores. The default weights are **equal — 0.2 each** — unless a later recorded decision tunes them; the weights are documented wherever a score is explained ([ADR-0020](../../06-adrs/ADR-0020-integrity-scoring-model.md)). The default **gate threshold is 0.6**: below it, dependent analytics declare themselves **Bounded** ([Documentation Standard §9](../../02-standards/DOCUMENTATION-STANDARD.md)) rather than presenting a result as if its inputs were sound.

The gate gates; it does not silently exclude. A below-threshold subgraph does not block work — it causes any analytic seeded from it to label itself Bounded, preserving honesty without preventing use. The trade-off this closes: a single hard pass/fail gate would be simpler to display but would hide the cost of acting on weak content; the Bounded signal keeps the result visible while flagging its weak foundation. The weights and threshold are provisional and tunable by a recorded decision, not silently ([ADR-0020](../../06-adrs/ADR-0020-integrity-scoring-model.md)).

A score is **always drillable**. Integrity is never shown as an opaque number; the five sub-scores and the inputs behind each are always reachable. A score with no drill-down is a defect, because an unexplainable number cannot be trusted or corrected.

---

## Scoring honestly when a spine role is absent

The spine asks for more than the seed implements: there is no `Intent` type, and `Value` is only partial ([spine-to-seed types](../../03-design/semantic-spine/spine-to-seed-types.md)). The policy is that the spine expectation is scoped to the roles the active metamodel can instantiate: a missing role with no type (today, Intent) is recorded as a **Bounded** coverage note on the score, not as a per-entity Completeness gap. This keeps the score honest in both directions — it neither lowers the bar to match a thin seed nor punishes every entity for a gap no user can close. When the [proposed spine-extension package](../../03-design/metamodel/proposed-spine-extension.md) lands, the scope widens and the note is removed.

---

## Worked example — Automation Fabric across the five dimensions

The `Capability` **Automation Fabric** (`n:capability:automation-fabric`, `tier = Supporting`) from the [baseline](../../data/base/baseline.yaml). Its neighbourhood at the viewpoint as-of valid time `2026-06-11`, layer `actual`, base case:

- It **serves** `Deliver` (a `ValueStreamStage`), via `e:capability-serves-deliver` (`confidence: 0.88`).
- It is **realised by** `Automation Orchestrator` (an `Application`), via inbound `e:automation-realises-automation` (`criticality: Medium`).
- No further upstream Intent is modelled (the role is PLANNED).

Reading the five dimensions (the sub-scores below are illustrative of the _shape_; the numeric composite depends on the configured weights and freshness policy, and is not asserted here):

| Dimension         | Reading for Automation Fabric                                                                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Completeness**  | High — it carries `name` and `tier`, has a `serves` link (Value role) and an inbound `realises` (Execution role). The Intent role above is Bounded, not a gap.            |
| **Connectivity**  | High — it is reachable along the spine: realised by an application below, serving a value-stream stage above; no orphan at the links the seed can express.                |
| **Recency**       | Depends on freshness policy — the supporting facts are baseline-seeded; against a recency policy they may read as moderately fresh.                                       |
| **Consistency**   | Clean — `tier = Supporting` is a legal enum value, and both relationships satisfy their endpoint and self/duplicate rules; no validation violation.                       |
| **Corroboration** | Moderate — the facts trace to an explicit baseline commit (an accepted Change Event), which is evidence, but to a single seeded source rather than corroborating lineage. |

The composite is shown with the five-dimension drill-down **and** the Bounded upper-spine coverage note — never as an opaque number ([ADR-0020](../../06-adrs/ADR-0020-integrity-scoring-model.md)). Because Automation Fabric scores cleanly on Consistency and Connectivity, a Metis impact analysis seeded from it would _not_ be gated as Bounded on integrity grounds; were the same capability missing its `serves` link and its supporting source, the composite could fall below `0.6` and any impact seeded from it would report Bounded.

---

## Krisis — the folded validation concern

Validation, rules, and data-quality (the **Krisis** concern, [Documentation Standard §10](../../02-standards/DOCUMENTATION-STANDARD.md)) live inside integrity scoring rather than as a separate module, feeding the Consistency dimension. The split-out trigger recorded in [ADR-0011](../../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md) is when data-quality earns a distinct invariant and seam of its own; until then it is a capability of Praxis integrity.

---

## References & standards

_Normative:_

- The integrity-scoring model — **[ADR-0020](../../06-adrs/ADR-0020-integrity-scoring-model.md)** and [Documentation Standard §8.1](../../02-standards/DOCUMENTATION-STANDARD.md). The five dimensions, the `[0,1]` range, the Inferred classification, and the always-drillable rule.

## Related documents

| Document                                                                                                                                 | What it covers                                         |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| [ADR-0020](../../06-adrs/ADR-0020-integrity-scoring-model.md)                                                                            | The integrity-scoring model — the canonical decision.  |
| [ADR-0021](../../06-adrs/ADR-0021-confidence-and-trust-scale.md)                                                                         | Confidence — the distinct axis that qualifies results. |
| [How the spine drives integrity and explainability](../../03-design/semantic-spine/how-the-spine-drives-integrity-and-explainability.md) | What Completeness and Connectivity measure against.    |
| [Validation rules](../../03-design/metamodel/validation-rules.md)                                                                        | What the Consistency dimension reads.                  |
| [Explainability](./explainability.md)                                                                                                    | How the score's reasoning is presented to the user.    |
| [`baseline.yaml`](../../data/base/baseline.yaml)                                                                                         | The seed dataset the example uses.                     |
