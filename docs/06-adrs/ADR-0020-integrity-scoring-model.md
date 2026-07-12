# ADR-0020: Integrity Scoring Model

- Status: Accepted
- Date: 2026-06-11
- Depends-On: ADR-0001
- Relates-To: ADR-0021, ADR-0027

## Context

Several documents referred to "integrity" without one definition, so the same word meant different things on different
surfaces. The product needs a single, explainable measure of how well-founded a piece of modelled content is — strong
enough to gate dependent analytics, honest enough to drill into.
[DOCUMENTATION-STANDARD.md §8.1](../02-standards/DOCUMENTATION-STANDARD.md) fixes the five dimensions and names this ADR
as the governing decision; this ADR records the model itself.

## Governance Framing

- **Decision type:** Invariant (the five dimensions and the [0,1] range; integrity is Inferred and always drillable) +
  stable seam (the score's shape and the dimension breakdown other surfaces consume).
- **Known future pressure:** demands to tune weights per workspace; new dimensions; per-type freshness policies;
  pressure to treat the score as a hard pass/fail.
- **What stays stable:** the five dimensions; the [0,1] range; integrity is Inferred content, never Asserted; a score is
  never shown without its drill-down.
- **What is provisional:** the default weights, the default gate threshold, and the per-type freshness policies feeding
  Recency.
- **What is deferred:** per-workspace weight configuration; learned weighting.
- **Why hard to reverse:** the score and its dimension breakdown are consumed by analytics gates and surfaced across the
  UI; changing the dimensions or range changes the meaning everywhere it appears.

## Decision

- **An integrity score is a number in `[0.0, 1.0]`** that Praxis computes for an entity, relationship, artefact result,
  or subgraph, expressing how well-founded the modelled content is. It is the single definition; documents reference it
  and do not redefine it ([DOCUMENTATION-STANDARD.md §8.1](../02-standards/DOCUMENTATION-STANDARD.md)).

- **It is computed over five dimensions:** **Completeness** (are expected slots and relationships present?),
  **Connectivity** (is the content reachable along the expected spine, with no orphan where the spine requires a link?),
  **Recency** (how fresh are the supporting facts against the freshness policy for their type?), **Consistency** (does
  the content violate any effective-schema validation rule or cardinality constraint?), and **Corroboration** (is there
  evidence — a source, an import lineage, an accepted Change Event — behind the claims?). These are the five §8.1
  dimensions verbatim.

- **The composite is a weighted mean with documented default weights.** The default weights are equal across the five
  dimensions (0.2 each) unless a later, recorded decision tunes them; the weights are documented wherever a score is
  explained. The default **gate threshold is 0.6**: below it, dependent analytics declare themselves `Bounded`
  ([DOCUMENTATION-STANDARD.md §9](../02-standards/DOCUMENTATION-STANDARD.md)) rather than presenting a result as if its
  inputs were sound. The threshold gates; it does not silently exclude.

- **Integrity is Inferred content, never Asserted** ([`CONTEXT.md`](../../CONTEXT.md)). It is derived by declared rule
  from canonical material, traceable to its inputs, and recomputed when those inputs change
  ([ADR-0027](./ADR-0027-projection-consistency-model.md)). It is never authored and never silently promoted to a claim.

- **A score is always drillable.** Integrity is never shown as an opaque number; the five dimension sub-scores and the
  inputs behind each are always reachable. An integrity figure with no drill-down is a defect, because an unexplainable
  number cannot be trusted or corrected.

- **Integrity scores the model content; confidence qualifies a result**
  ([ADR-0021](./ADR-0021-confidence-and-trust-scale.md)). The two are distinct axes: a high-integrity subgraph can still
  yield a low-confidence analytic result if the analysis was bounded. Neither substitutes for the other.

## Considered Options

- **A single opaque "health" number (rejected):** easy to display, impossible to act on or correct; the five-dimension
  breakdown is what makes the score useful.
- **Treating integrity as Asserted (rejected):** it would then be human-controlled and not recomputed on input change,
  defeating its purpose; Inferred is the correct classification.
- **A hard pass/fail gate (rejected):** a binary gate hides the cost; declaring dependent analytics `Bounded` keeps the
  result visible while flagging its weak foundation.

## Consequences

- Below-threshold subgraphs do not block work; they cause dependent analytics to label themselves `Bounded`, preserving
  honesty without preventing use.
- Every integrity figure on every surface carries a drill-down to its five dimensions.
- A worked example: an `Application` with a name and a `realises` relationship to a `Capability` but no `accesses`
  relationship to any `DataEntity`, no recent supporting fact, and no source scores high on Consistency, lower on
  Completeness and Connectivity, and low on Recency and Corroboration; the composite falls below 0.6, so an impact
  analysis seeded from it reports `Bounded`.
- Default weights and the 0.6 threshold are tunable later by a recorded decision, not silently.

## Follow-ups / Open Questions

- Per-type Recency freshness policies and where they are configured.
- Whether weights become per-workspace configurable, and the governance for that.
- The precise definition of "the expected spine" for Connectivity against the semantic-spine reconciliation
  ([DOCUMENTATION-STANDARD.md §12](../02-standards/DOCUMENTATION-STANDARD.md)).

## References & standards

- [DOCUMENTATION-STANDARD.md §8.1](../02-standards/DOCUMENTATION-STANDARD.md) _(normative: the five dimensions)_.

## Related documents

| Document                                               | What it covers                                           |
| ------------------------------------------------------ | -------------------------------------------------------- |
| [`CONTEXT.md`](../../CONTEXT.md)                       | Inferred content — the classification integrity carries. |
| [ADR-0021](./ADR-0021-confidence-and-trust-scale.md)   | Confidence — the distinct axis that qualifies results.   |
| [ADR-0027](./ADR-0027-projection-consistency-model.md) | Recompute-on-input-change for derived content.           |
