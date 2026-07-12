# Content Classification

Content classification is part of the meaning of every result, not a minor label. It is the per-claim axis stating
**what kind of claim** a fact carries — **Asserted**, **Inferred**, or **Generated** — and it changes whether a result
can be acted on as fact, reviewed as a recommendation, or treated as a working hypothesis. The definitions are canonical
in [`CONTEXT.md`](../../../CONTEXT.md) and the
[Documentation Standard §9](../../02-standards/DOCUMENTATION-STANDARD.md); this document gives the product display
rules, not new definitions.

Classification is orthogonal to two other axes it is often confused with: **provenance** (the origin of a claim) and
**confidence** (a quality signal on a result). A fact has a content classification, a provenance, and — where relevant —
a confidence, independently.

## The three classifications

| Classification | Meaning                                                                                                          | Trust posture                                                                                                                                 |
| -------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Asserted**   | Explicitly stated or accepted by a human or trusted source — the controlled truth of the model.                  | Authoritative; never silently overwritten by automation.                                                                                      |
| **Inferred**   | Derived from asserted facts by declared rule, structure, or analytics; traceable; recomputed when inputs change. | Derived and reviewable; grounded in assertions but not itself a human assertion.                                                              |
| **Generated**  | Produced by an LLM/ML process — a summary, suggested mapping, draft, or annotation.                              | A suggestion until accepted; acceptance writes a **new Asserted operation**, and the original Generated item remains traceable as provenance. |

The system **never silently promotes Generated to Asserted.** Acceptance is an explicit operation by a human; the
integrity scoring axis ([ADR-0020](../../06-adrs/ADR-0020-integrity-scoring-model.md)) treats an integrity score itself
as Inferred content.

## Display rules

| Classification | Rendering cue                                                                     | Behaviour                                                                      |
| -------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **Asserted**   | Standard display, no qualifier.                                                   | The baseline; edited only through task-based [editing](../ux/editing-flow.md). |
| **Inferred**   | Qualifier label; the derivation path is reachable from the inspector in one step. | Re-evaluated automatically when an input fact changes.                         |
| **Generated**  | Distinct visual treatment; an explicit accept/reject/inspect affordance.          | Stays labelled until accepted; no silent auto-accept.                          |

A result may also carry a **result state** — Stale, Partial/Bounded, Rebuilding, In progress, Awaiting review, Failed
([Documentation Standard §9](../../02-standards/DOCUMENTATION-STANDARD.md)). The two axes never collapse into one badge:
a Generated suggestion can also be Stale, and an Asserted fact can be Awaiting review. A surface carries one content
classification per element and any number of result states. A tidy surface that hides these states is still misleading.

## Worked example

In the seed ([`baseline.yaml`](../../data/base/baseline.yaml)):

- The `Application` **Insight Hub**'s `disposition: Invest` is **Asserted** — it was seeded as a controlled claim, and
  renders with no qualifier.
- A health roll-up computed by walking the `realises` edge from `Insight Hub` to `Customer Insight` and combining
  lifecycle and criticality is **Inferred** — it renders with a qualifier and a one-click path to the contributing
  relationships.
- A draft narrative produced by [Sophia](../../05-modules/sophia/README.md) (planned) summarising the FY26 modernization
  plan is **Generated** — it renders distinctly with accept/reject/inspect, and only becomes an Asserted note when a
  human accepts it.

If the roll-up's input changes (say `Insight Hub`'s `lifecycle` is updated), the Inferred value is recomputed and, until
it is, shows as **Stale** — a result state, not a reclassification.

## Related documents

| Document                                                           | What it covers                                   |
| ------------------------------------------------------------------ | ------------------------------------------------ |
| [the-contract.md](./the-contract.md)                               | The contract field that declares classification. |
| [explanation-surfaces.md](./explanation-surfaces.md)               | Where the derivation and acceptance paths live.  |
| [intelligence-and-automation.md](./intelligence-and-automation.md) | Why Generated never becomes Asserted silently.   |
| [trust-and-honesty.md](../trust-and-honesty.md)                    | The honest-state obligations these rules serve.  |
