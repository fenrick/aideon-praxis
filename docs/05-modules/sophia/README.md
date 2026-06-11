# Sophia — AI assistance

Sophia is the planned AI-assistance engine of the Aideon twin: LLM-assisted authoring and enrichment behind centralised guardrails. Every Sophia output is **Generated** content — a suggestion until a human accepts it, never a fact Sophia writes.

> **Implementation status: PLANNED.** No `aideon_sophia` crate exists. Everything in this folder is **design intent** — framed in the present tense as the standard requires, but describing behaviour not yet in code. The boundary, the Generated-until-accepted invariant, the grounding obligation, and the model-card requirement are normative now and constrain the implementation when it lands. The governing decision is [ADR-0014](../../06-adrs/ADR-0014-ai-assistance-and-generated-provenance-sophia.md).

This README is the index and the cross-cutting narrative; each focused topic lives in its own file, per the [Documentation Standard §4](../../02-standards/DOCUMENTATION-STANDARD.md) granularity rule.

---

## Contents

1. [Guardrails and provenance](./guardrails-and-provenance.md) — Generated content, acceptance as a new Asserted operation, the host capability, and the offline posture.
2. [Grounding and retrieval](./grounding-and-retrieval.md) — RAG over Lexis retrieval rather than free generation.
3. [Model cards](./model-cards.md) — per-output disclosure for every generated suggestion.

---

## One-line role

Sophia drafts descriptions, suggests mappings, and enriches a sparse twin by producing **Generated** suggestions grounded in retrieved twin content, each carrying a confidence band and a model card, none of which becomes a fact until a human accepts it.

## The boundary it occupies

Sophia occupies the **generation** boundary: it turns a prompt plus retrieved context into a suggestion and hands it back, classified Generated, for a human to accept or reject. It sits behind a host capability, never in the renderer, so the trust boundary and the network posture stay governed by the host ([ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)).

## Invariants

- **All output is Generated.** Every Sophia output is classified **Generated** ([`CONTEXT.md`](../../../CONTEXT.md)) the moment it is produced and stays a suggestion. Sophia writes no fact and never silently promotes a suggestion to Asserted ([ADR-0014](../../06-adrs/ADR-0014-ai-assistance-and-generated-provenance-sophia.md)).
- **Acceptance writes a new Asserted operation.** When a human accepts a suggestion, the act compiles into a _new_ operation recording an **Asserted** claim, with the original Generated item retained as provenance; the Generated item is never mutated in place. Rejection writes nothing. There is no silent promotion ([ADR-0014](../../06-adrs/ADR-0014-ai-assistance-and-generated-provenance-sophia.md)).
- **Generation is grounded by retrieval.** Sophia grounds output in twin content retrieved through [Lexis](../lexis/README.md) (Lewis et al., Retrieval-Augmented Generation, 2020). A suggestion that cannot be grounded is surfaced as low-confidence or withheld, not presented as confident.
- **Every output carries confidence and a model card.** A generated suggestion carries a confidence band ([ADR-0021](../../06-adrs/ADR-0021-confidence-and-trust-scale.md)) and the producing model is documented by a model card (Mitchell et al., Model Cards for Model Reporting, 2019). An opaque generation with no provenance is not acceptable.
- **Behind a host capability, offline by default.** The LLM sits behind the typed IPC seam, not in the renderer; the default posture is a local model ([ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)).

## What it owns / what it does not own

**Owns:** the generation request/response contract and its provenance fields; the classification of output as Generated; the grounding step (composing retrieved context into the prompt); the confidence band and model card on each output; the guardrail posture (NIST AI RMF 1.0).

**Does not own:** retrieval (Lexis); canonical writes on acceptance (Mneme); the content-classification axis itself ([`CONTEXT.md`](../../../CONTEXT.md)); the confidence scale definition ([ADR-0021](../../06-adrs/ADR-0021-confidence-and-trust-scale.md)); the trust boundary and network policy (Host). Sophia never decides to assert; a human does.

## Public trait seam (design intent)

Sophia is reached only through the host. The planned seam separates generation from acceptance, so promotion is always an explicit, separate step:

```rust
// design intent — not yet a crate
pub trait Sophia {
    fn generate(&self, request: &GenerationRequest, grounding: &RetrievedContext)
        -> Result<Vec<Suggestion>, ProblemDetails>; // each Generated, with confidence + model-card ref
}
```

A `Suggestion` is Generated content carrying its confidence band, its grounding (the retrieved content it was built on), and a reference to the model card. **Acceptance is not a Sophia call** — it is a separate operation on the canonical path that writes an Asserted claim with the suggestion retained as provenance. Errors follow RFC 9457 ([ADR-0016](../../06-adrs/ADR-0016-error-envelope-rfc9457.md)). The shapes are provisional until a crate exists.

## Integration with other modules (via the host)

Sophia is an engine and **depends on no other engine** ([ADR-0011](../../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md)). The host composes it:

- **[Lexis](../lexis/README.md)** — supplies the bounded, viewpoint-aware retrieval Sophia grounds on; the host wires retrieval into the generation request.
- **Mneme** — writes the new Asserted operation when a human accepts a suggestion.
- **Renderer** — presents Generated suggestions visually distinguishable from Asserted and Inferred content, with their confidence and the accept/reject affordance.

The planned crate name is `aideon_sophia`.

## References & standards

_Normative:_

- Lewis et al. — **Retrieval-Augmented Generation**, 2020. Grounding generation in twin content.
- Mitchell et al. — **Model Cards for Model Reporting**, 2019. Per-output disclosure.

_Informative:_

- **NIST AI Risk Management Framework** (AI RMF 1.0). Governance, guardrails, and provenance posture.

Full bibliography: [STANDARDS-REGISTER.md](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                                            | What it covers                                                     |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| [ADR-0014](../../06-adrs/ADR-0014-ai-assistance-and-generated-provenance-sophia.md) | The decision that introduces Sophia and fixes its invariants.      |
| [`CONTEXT.md`](../../../CONTEXT.md)                                                 | The content-classification axis (Asserted / Inferred / Generated). |
| [Lexis module](../lexis/README.md)                                                  | The retrieval Sophia grounds generation on.                        |
| [ADR-0021](../../06-adrs/ADR-0021-confidence-and-trust-scale.md)                    | The confidence scale generated suggestions carry.                  |
| [Module dependency map](../../01-architecture/module-dependency-map.md)             | The crate dependency graph and the acyclic invariant.              |
