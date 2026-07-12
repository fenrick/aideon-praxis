# Model cards

Why every Sophia output carries a model card and a confidence band, and what that disclosure contains. For practitioners
who must judge whether to act on a generated suggestion.

> **PLANNED.** No `aideon_sophia` crate exists; this is design intent per
> [ADR-0014](../../06-adrs/ADR-0014-ai-assistance-and-generated-provenance-sophia.md).

## An opaque generation is not acceptable

Every Sophia output carries **confidence and a model card**
([ADR-0014](../../06-adrs/ADR-0014-ai-assistance-and-generated-provenance-sophia.md)). The rule is simple: an opaque
generation with no provenance is not acceptable. A reader deciding whether to accept a suggestion needs to know how much
to rely on it and what produced it.

## The confidence band

A generated suggestion carries a **confidence band** on the product's single confidence scale
([ADR-0021](../../06-adrs/ADR-0021-confidence-and-trust-scale.md)): High, Medium, Low, or Indicative, each with its
defined score band ([Documentation Standard §8.2](../../02-standards/DOCUMENTATION-STANDARD.md)). Confidence qualifies
_the suggestion_ — how much it should be relied on within its stated scope. It is distinct from a Lexis ranking score
(which only orders retrieval results, see [Lexis bounds and ranking](../lexis/bounds-and-ranking.md)) and from an
integrity score (which scores model content, [ADR-0020](../../06-adrs/ADR-0020-integrity-scoring-model.md)). The
confidence-calibration method for generated suggestions, and exactly how it maps onto the §8.2 bands, is an open
question in [ADR-0014](../../06-adrs/ADR-0014-ai-assistance-and-generated-provenance-sophia.md).

## The model card

The producing model is documented by a **model card** (Mitchell et al., **Model Cards for Model Reporting**, 2019),
stating intended use, limitations, and known failure modes
([ADR-0014](../../06-adrs/ADR-0014-ai-assistance-and-generated-provenance-sophia.md)). This is the same per-output
disclosure obligation [Metis](../metis/model-cards.md) bears for any ML-derived result, and which the
[Lexis](../lexis/full-text-and-semantic.md) embedding model bears — Sophia, Metis, and Lexis share the model-card
discipline so any ML output in the product is disclosed the same way. The shape of the model-card record and where it is
stored is an open question in [ADR-0014](../../06-adrs/ADR-0014-ai-assistance-and-generated-provenance-sophia.md).

A model card typically records: the model and version; its intended use; the data it was trained on at a suitable level
of generality; quantitative limitations; and known failure modes. For Sophia the intended use is bounded — drafting and
enrichment grounded in twin content, never autonomous assertion (see
[guardrails and provenance](./guardrails-and-provenance.md)) — and that boundary is part of what the card states.

## Why this is governed, not decorative

The model card and confidence band follow the **NIST AI Risk Management Framework** (AI RMF 1.0) posture for governance
and provenance of generated content
([ADR-0014](../../06-adrs/ADR-0014-ai-assistance-and-generated-provenance-sophia.md)). They are not labels added for
show: they change what a reader should do. A Low-confidence suggestion from a model whose card states a known weakness
in the relevant area is a prompt to verify before accepting; a High-confidence suggestion is still only a prompt to
review, because acceptance is always an explicit human act
([guardrails and provenance](./guardrails-and-provenance.md)).

## Worked example

Sophia suggests a description for the seed `Capability` `n:capability:automation-fabric` ("Automation Fabric"). The
suggestion is presented as Generated, `Awaiting review`, with a **Medium** confidence band and a link to the model card
for the local model that produced it. The card states the model's intended use (drafting twin descriptions from
retrieved context), its limitation (bounded by local-model quality,
[ADR-0014](../../06-adrs/ADR-0014-ai-assistance-and-generated-provenance-sophia.md)), and a known failure mode
(over-generalising sparse context). The steward reads Medium confidence and the card's note, verifies against the
retrieved grounding, and accepts — at which point a new Asserted operation records the description, the suggestion and
its card retained as provenance.

## References & standards

_Normative:_

- Mitchell et al. — **Model Cards for Model Reporting**, 2019. The per-output disclosure shape.

_Informative:_

- **NIST AI Risk Management Framework** (AI RMF 1.0). The governance posture the disclosure serves.

Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                         | What it covers                                   |
| ---------------------------------------------------------------- | ------------------------------------------------ |
| [Sophia README](./README.md)                                     | The module index and invariants.                 |
| [Guardrails and provenance](./guardrails-and-provenance.md)      | Why a model card never licenses auto-acceptance. |
| [Metis model cards](../metis/model-cards.md)                     | The shared model-card obligation for ML output.  |
| [ADR-0021](../../06-adrs/ADR-0021-confidence-and-trust-scale.md) | The confidence scale the band uses.              |
