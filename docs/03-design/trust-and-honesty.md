# Trust and Honesty

The product's obligation never to present a partial, stale, generated, or bounded result as if it were complete, fresh,
asserted, or unbounded. This is a core invariant (axiom 10, [design-axioms.md](./design-axioms.md)), not a nice-to-have.
This document states the obligation and points at the single vocabulary it rests on; it does **not** redefine the
states.

The honest-state vocabulary is fixed once, in the
[Documentation Standard §9](../02-standards/DOCUMENTATION-STANDARD.md), so that every surface and document uses the same
words. Two orthogonal axes apply, and they never collapse into one badge:

- **Content classification** — what _kind_ of claim a fact is: **Asserted**, **Inferred**, **Generated**
  ([`CONTEXT.md`](../../CONTEXT.md)).
- **Result state** — the condition of a result when shown: **Fresh**, **Stale**, **Rebuilding**, **Partial/Bounded**,
  **In progress**, **Awaiting review**, **Failed**.

A surface carries one content classification per element and any number of result states. "Generated" (a claim kind) is
not "Stale" (a freshness condition), and a result can be both.

## The obligations

These follow from the standard and bind every surface in this layer:

1. **Declare the classification.** Every rendered element is Asserted, Inferred, or Generated, and the distinction is
   visible — Inferred carries its derivation path; Generated is visually distinct and requires explicit acceptance
   before it becomes Asserted (a new operation). The system never silently promotes Generated to Asserted. See
   [artefacts/content-classification.md](./artefacts/content-classification.md).
2. **Declare the result state.** A result that was bounded, has gone stale, is rebuilding, is still executing, is queued
   for review, or failed says so in place — not in a footnote, and not in a log file. See
   [ux/honest-state-treatment.md](./ux/honest-state-treatment.md).
3. **Quantify quality with the unified scales.** Where a result expresses how well-founded the model is, it uses the
   [integrity score](../02-standards/DOCUMENTATION-STANDARD.md)
   ([ADR-0020](../06-adrs/ADR-0020-integrity-scoring-model.md)); where it expresses how much to rely on a result or
   signal, it uses the [confidence scale](../02-standards/DOCUMENTATION-STANDARD.md)
   ([ADR-0021](../06-adrs/ADR-0021-confidence-and-trust-scale.md)). Neither is redefined in this layer.
4. **Keep evidence within reach.** A user must be able to trace the reasoning behind a dependency, warning, score, or
   scenario delta far enough to judge whether it is credible, in at most one step (Pirolli & Card, Information Foraging,
   1999). See [artefacts/explanation-surfaces.md](./artefacts/explanation-surfaces.md).
5. **Cut quality words.** The product demonstrates trustworthiness rather than asserting it. A surface never says
   "robust" or "accurate"; it shows the classification, the freshness, the bounds, and the path to evidence.

## The trade-off

Honest state costs surface area: an optimistic UI that rendered "saved" the instant a write was dispatched, or that hid
a bounded result behind a clean number, would look faster and tidier. The product spends that surface area deliberately
— a clean surface that hides uncertainty is not a better experience, it is a misleading one, and the cost of misleading
a decision-maker is far higher than the cost of a caveat strip.

## References & standards

_Normative:_

- **[Documentation Standard §9](../02-standards/DOCUMENTATION-STANDARD.md)**. The single honest-state vocabulary this
  document defers to.
- [ADR-0020](../06-adrs/ADR-0020-integrity-scoring-model.md),
  [ADR-0021](../06-adrs/ADR-0021-confidence-and-trust-scale.md). The integrity and confidence scales.

_Informative:_

- Nielsen — **10 Usability Heuristics**, 1994. Visibility of system status; help users recognise rather than recall.
- Pirolli & Card — **Information Foraging**, 1999. Information scent for evidence drill-down.

Recorded in the [standards register](../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                                         | What it covers                                     |
| -------------------------------------------------------------------------------- | -------------------------------------------------- |
| [ux/honest-state-treatment.md](./ux/honest-state-treatment.md)                   | How result states render in the shell.             |
| [artefacts/content-classification.md](./artefacts/content-classification.md)     | The display rules for Asserted/Inferred/Generated. |
| [signal-surfaces/README.md](./signal-surfaces/README.md)                         | How signals carry their honest state.              |
| [participation-and-trust/trust-cues.md](./participation-and-trust/trust-cues.md) | The trust cues every role relies on.               |
