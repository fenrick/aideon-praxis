# Model cards

How Metis discloses any output derived from a machine-learning model: with a model card stating intended use, accuracy, and limitations. For a reader who needs to know when a result is ML-derived and what disclosure accompanies it.

This describes **design intent** ([README](./README.md)).

---

## When a model card applies

Most Metis results are **Inferred** — derived by a declared, deterministic algorithm from canonical material ([determinism and bounds](./determinism-and-bounds.md)). A deterministic centrality or path result is not a model output and does not need a model card; its algorithm metadata is its disclosure.

A model card applies when a result is produced by an **ML model** — a learned ranking, a learned cost estimator, a clustering that depends on trained parameters rather than a closed-form definition. Such a result is **Generated** or model-Inferred content and must carry a **model card** (Mitchell et al., _Model Cards for Model Reporting_, 2019), the per-output disclosure standard the corpus adopts ([STANDARDS-REGISTER.md](../../02-standards/STANDARDS-REGISTER.md)).

---

## What a model card states

Following Mitchell et al. (2019), a card accompanying an ML-derived Metis output states, at minimum:

- **Intended use** — the question the model is meant to answer, and the questions it is not;
- **Inputs and training basis** — what the model was trained or tuned on;
- **Performance and accuracy** — the metrics under which it was evaluated, and on what data;
- **Limitations and known failure cases** — where the output is unreliable;
- **Honest-state classification** — that the output is Generated or model-Inferred, not Asserted, and how it is qualified by [confidence](../../06-adrs/ADR-0021-confidence-and-trust-scale.md).

The card travels with the result, so a surface presenting an ML-derived ranking can show its intended use and limitations rather than an unqualified score. This is the same disclosure discipline AI assistance (Sophia, planned) carries for generated content ([ADR-0014](../../06-adrs/ADR-0014-ai-assistance-and-generated-provenance-sophia.md)).

---

## Why disclosure, and the trade-off

An ML output presented without its limitations invites a user to act on it as if it were a deterministic fact. The model card closes that door: it makes the output's basis and bounds visible, at the cost of every ML result carrying disclosure overhead. The architecture accepts that overhead because an undisclosed model output is, in an EA tool that drives investment decisions, the most expensive kind of false confidence — and because the honest-state vocabulary already requires the Generated/Inferred distinction to be visible ([Documentation Standard §9](../../02-standards/DOCUMENTATION-STANDARD.md)).

Today Metis's specified families are deterministic, so model cards are a forward-looking obligation: when a learned component is introduced, it ships with a card, and a result without one must not be presented as ML-derived.

---

## References & standards

_Normative:_

- Mitchell et al. — **Model Cards for Model Reporting**, 2019. Per-output documentation of intended use, accuracy, and limitations.

## Related documents

| Document                                                                            | What it covers                                              |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| [Explainable evidence](./explainable-evidence.md)                                   | The evidence a non-ML deterministic result carries instead. |
| [Determinism and bounds](./determinism-and-bounds.md)                               | Why most Metis results are deterministic Inferred content.  |
| [ADR-0021](../../06-adrs/ADR-0021-confidence-and-trust-scale.md)                    | The confidence scale a model output is qualified by.        |
| [ADR-0014](../../06-adrs/ADR-0014-ai-assistance-and-generated-provenance-sophia.md) | The Generated-content discipline Sophia carries.            |
