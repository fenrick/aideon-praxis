# HIG: Provenance and Generated Work

How Aideon presents content classification, freshness, explainability, assumptions, and generated work. In this product, trust is a user-interface responsibility as much as a backend one. Apply this page when designing or reviewing any surface that presents claims, metrics, summaries, recommendations, inferred values, or generated output that a user may reasonably inspect or challenge.

It does not cover raw backend observability or developer audit trails — this is about user-facing trust surfaces.

---

## The principle

Provenance is part of the main reading experience, not an appendix. If the product expects a user to trust a figure, a recommendation, or a block of generated text, it **must** also give them a practical way to inspect what supports it. Generated work raises the same requirement with more urgency: assistance that cannot be reviewed, bounded, or traced becomes theatre.

This page aligns to the corpus's honesty model. Two distinct axes are presented as distinct signals ([DOCUMENTATION-STANDARD.md §9](../../02-standards/DOCUMENTATION-STANDARD.md)): **content classification** (Asserted / Inferred / Generated — what kind of claim) and **result state** (Fresh / Stale / Rebuilding / Partial / In progress / Awaiting review / Failed — the condition when shown). The visual treatments are owned by the design system ([design-system/honest-state-treatments.md](../design-system/honest-state-treatments.md)); the broader presentation of analytical and ML output as prompts for judgement is the [signal surfaces](../signal-surfaces/README.md) contract.

## Content classification and freshness

Users need a direct path from an output to its source inputs, active filters, the viewpoint, assumptions, and freshness — close enough to the work that it informs judgement rather than hiding in a compliance surface ([trust-and-honesty.md](../trust-and-honesty.md)). Each value carries its classification: an Asserted claim is controlled truth; an Inferred value is derived and traceable and recomputed when inputs change; a Generated value is a suggestion until acceptance writes a new Asserted operation ([CONTEXT.md](../../../CONTEXT.md)). Freshness has equal clarity: if data is cached, partial, stale, or awaiting workflow completion, the interface says so — a user cannot judge output quality with the state of the input hidden.

## Explainability

Explainability matches the surface. A chart may need a compact account of inputs, filters, and derivation. A generated narrative needs source references, scope statements, and a clear boundary between retrieved evidence and generated synthesis. A recommendation needs assumptions and alternatives. An Inferred integrity score is never shown without the ability to drill into its five dimensions ([DOCUMENTATION-STANDARD.md §8.1](../../02-standards/DOCUMENTATION-STANDARD.md)). The point is not to dump technical exhaust into the UI; it is to give the user enough structure to understand why the system is saying what it says ([signal-surfaces/README.md](../signal-surfaces/README.md)).

## Generated and assisted output

When the system writes, summarises, maps, classifies, or transforms, the interface shows what scope it operated over, what kind of output it produced, and what the user can do next — review before commit, compare alternatives, edit directly, reject, or trace what changed. Generated output **must not** inherit authority from polish: a cleanly rendered answer can still be weakly supported, out of date, or based on incomplete scope, and the Generated treatment — the most visually distinct classification ([design-system/honest-state-treatments.md](../design-system/honest-state-treatments.md)) — helps the user see that without performing an investigation each time. Generated content is produced by [Sophia](../../05-modules/sophia/README.md) (planned) behind centralised guardrails and is all Generated until accepted; the assisted-interaction patterns are in [assisted-work.md](./assisted-work.md).

## Accessibility

Provenance and explainability controls need descriptive labels, sensible focus order, and content that stays meaningful read aloud. Source references, freshness notices, and generated-output marks **must not** depend on colour or visual proximity alone — the greyscale obligation ([design-system/honest-state-treatments.md](../design-system/honest-state-treatments.md), [ADR-0024](../../06-adrs/ADR-0024-accessibility-baseline-wcag22.md)).

## Content rules

Trust copy is blunt and specific: say what inputs were used, which assumptions matter, whether the result is partial, and how to inspect more. Avoid confidence theatre, vague assurances, and euphemisms that make limitations sound like product magic.

## Worked example

A generated capability description renders in the inspector with the `generated` provenance treatment (spark glyph + label, distinct in greyscale) and a scope statement naming the entities it drew on. Below it, a "trace" affordance opens the source references. The user edits two sentences and accepts; acceptance writes a new Asserted operation, and the value's treatment switches from Generated to Asserted ([CONTEXT.md](../../../CONTEXT.md)). The original Generated item remains traceable as provenance and is never mutated in place.

## References & standards

_Normative:_

- Mitchell et al. — **Model Cards for Model Reporting**, 2019. Disclosure for generated suggestions ([Sophia](../../05-modules/sophia/README.md)).

_Informative:_

- **NIST AI Risk Management Framework** (AI RMF 1.0). Provenance posture for generated content.

## Related documents

| Document                                                                                | What it covers                                    |
| --------------------------------------------------------------------------------------- | ------------------------------------------------- |
| [DOCUMENTATION-STANDARD.md §9](../../02-standards/DOCUMENTATION-STANDARD.md)            | The content-classification and result-state axes. |
| [design-system/honest-state-treatments.md](../design-system/honest-state-treatments.md) | The provenance and freshness treatments.          |
| [signal-surfaces/README.md](../signal-surfaces/README.md)                               | Analytical/ML output as prompts for judgement.    |
| [assisted-work.md](./assisted-work.md)                                                  | The assisted-interaction patterns.                |
| [trust-and-honesty.md](../trust-and-honesty.md)                                         | The product-level honesty obligations.            |
