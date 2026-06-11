# ADR-0021: Confidence and Trust Scale

- Status: Accepted
- Date: 2026-06-11
- Depends-On: ADR-0001
- Relates-To: ADR-0020, ADR-0014

## Context

"Confidence" appeared across the corpus with no shared bands, so a "high-confidence" signal on one surface was not comparable with another. The product needs one ordinal scale that qualifies how much a result, signal, or generated suggestion should be relied upon — and a clear statement of how it differs from integrity, with which it was being conflated. [DOCUMENTATION-STANDARD.md §8.2](../02-standards/DOCUMENTATION-STANDARD.md) fixes the bands and names this ADR as the governing decision; this ADR records the scale.

## Governance Framing

- **Decision type:** Invariant (the four ordinal bands and their score ranges; confidence qualifies a result, not the model) + stable seam (the confidence label carried on results, signals, and suggestions).
- **Known future pressure:** new signal sources; calibration of generated-suggestion confidence; pressure to act automatically on High.
- **What stays stable:** the four bands (High/Medium/Low/Indicative) and their ranges; confidence is distinct from integrity; High is a basis to act within scope, never a licence to auto-assert.
- **What is provisional:** how each producer derives its underlying number before banding.
- **What is deferred:** per-domain calibration curves; user-adjustable thresholds.
- **Why hard to reverse:** the bands are surfaced wherever a result or suggestion appears; changing a range silently reclassifies existing signals.

## Decision

- **Confidence is an ordinal label with a defined score band,** optionally shown with the underlying number ([DOCUMENTATION-STANDARD.md §8.2](../02-standards/DOCUMENTATION-STANDARD.md)):

  | Label          | Band        | Meaning                                                    |
  | -------------- | ----------- | ---------------------------------------------------------- |
  | **High**       | `≥ 0.85`    | Well-corroborated; safe to act on within the stated scope. |
  | **Medium**     | `0.60–0.85` | Usable with awareness of its caveats.                      |
  | **Low**        | `0.30–0.60` | Indicative only; verify before acting.                     |
  | **Indicative** | `< 0.30`    | A prompt to look, not a basis to decide.                   |

  These are the §8.2 bands verbatim; documents reference them and do not redefine them.

- **Confidence qualifies a result; integrity scores the model content** ([ADR-0020](./ADR-0020-integrity-scoring-model.md)). The two are orthogonal: integrity asks "how well-founded is this content?", confidence asks "how much should I rely on this derived result?". A high-integrity subgraph can yield a low-confidence result when the analysis was bounded, approximated, or depth-limited. Neither is computed from the other.

- **Signals, analytic results, and generated suggestions all carry confidence.** A Metis analytic result carries the confidence of its computation (lowered when `Bounded`); a Sophia generated suggestion carries the confidence of its grounding ([ADR-0014](./ADR-0014-ai-assistance-and-generated-provenance-sophia.md)); an imported signal carries the confidence of its source. The producer derives the underlying number; this ADR fixes only the banding it maps onto.

- **High confidence is a basis to act, never a licence to auto-assert.** A High-confidence generated suggestion is still Generated until a human accepts it ([ADR-0014](./ADR-0014-ai-assistance-and-generated-provenance-sophia.md)); confidence informs the human's decision, it does not replace it. Confidence is a quality signal, not a promotion mechanism.

- **Confidence is presented honestly alongside result state.** A `Bounded` result ([DOCUMENTATION-STANDARD.md §9](../02-standards/DOCUMENTATION-STANDARD.md)) shows the bound and a confidence reduced to reflect it; the two are not collapsed into one badge. A label is shown with enough context that the reader knows what was relied upon.

## Considered Options

- **A single 0–100 score with no bands (rejected):** spuriously precise; ordinal bands communicate "act / use with care / verify / just look" more honestly than a bare number.
- **Reusing the integrity score as confidence (rejected):** conflates two distinct questions and would mislabel a bounded result over high-integrity content as trustworthy.
- **Two bands (trusted/untrusted) (rejected):** too coarse; the four-band scale matches the distinct actions a reader takes.

## Consequences

- A reader treats High as actionable within scope, Medium with caveats, Low as needing verification, and Indicative as a prompt to look — a consistent meaning across every surface.
- Generated suggestions never bypass human acceptance on the strength of confidence alone.
- Integrity and confidence appear side by side without conflation.
- A worked example: a betweenness-centrality result over a depth-bounded subgraph is shown `Bounded` with Low confidence even though the entities scored have high integrity; a Sophia `realises` suggestion grounded in two corroborating descriptions is shown Medium and remains Generated until accepted.

## Follow-ups / Open Questions

- How each producer derives its pre-banding number (Metis, Sophia, importers).
- Whether the underlying number is shown by default or on drill-down.
- Calibration of generated-suggestion confidence against observed acceptance rates.

## References & standards

- [DOCUMENTATION-STANDARD.md §8.2](../02-standards/DOCUMENTATION-STANDARD.md) _(normative: the confidence bands)_.

## Related documents

| Document                                                                | What it covers                                                            |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| [ADR-0020](./ADR-0020-integrity-scoring-model.md)                       | Integrity — the distinct axis that scores model content.                  |
| [ADR-0014](./ADR-0014-ai-assistance-and-generated-provenance-sophia.md) | Generated suggestions that carry confidence but still require acceptance. |
| [`CONTEXT.md`](../../CONTEXT.md)                                        | Confidence as a quality signal distinct from content classification.      |
