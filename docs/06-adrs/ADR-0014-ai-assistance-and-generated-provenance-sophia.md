# ADR-0014: AI Assistance and Generated Provenance — Sophia

- Status: Accepted
- Date: 2026-06-11
- Depends-On: ADR-0001, ADR-0006, ADR-0011
- Relates-To: ADR-0012, ADR-0021

## Context

LLM assistance is valuable for drafting descriptions, suggesting mappings, and enriching a sparse twin — and dangerous
if its output is mistaken for asserted truth. The product's honesty obligations rest on the content-classification axis
([`CONTEXT.md`](../../CONTEXT.md)): Asserted, Inferred, Generated. An LLM produces **Generated** content, a suggestion
until a human accepts it. The risk is silent promotion — generated text quietly becoming a fact no one chose to assert —
and ungrounded generation that invents entities the twin does not contain.

This ADR introduces **Sophia**, the planned AI-assistance module
([ADR-0011](./ADR-0011-module-taxonomy-and-boundaries.md)). It is design intent until a crate exists.

## Governance Framing

- **Decision type:** Invariant (all LLM output is Generated and never silently promoted; acceptance writes a new
  Asserted operation) + stable seam (the generation request/response contract and its provenance fields).
- **Known future pressure:** stronger models; agentic multi-step assistance; pressure to auto-accept high-confidence
  suggestions; hosted-model deployments.
- **What stays stable:** output is Generated; promotion requires an explicit Asserted operation; generation is grounded
  by retrieval; every output carries a model card; the LLM sits behind a host capability.
- **What is provisional:** the model, the prompt strategy, the retrieval window, and the confidence calibration.
- **What is deferred:** autonomous acceptance; multi-agent workflows; fine-tuning on workspace content.
- **Why hard to reverse:** the Generated-until-accepted invariant is a trust commitment surfaced everywhere generated
  content appears; relaxing it would silently change the meaning of the model. The model itself is replaceable.

## Decision

- **The LLM sits behind a host capability, not in the renderer.** Sophia is invoked through the typed IPC seam
  ([ADR-0006](./ADR-0006-tauri-trust-boundary-and-typed-ipc.md)); the renderer never calls a model directly and never
  holds model credentials. This keeps the trust boundary intact and the network posture governed by the host.

- **All Sophia output is Generated** ([`CONTEXT.md`](../../CONTEXT.md)). It is classified Generated the moment it is
  produced and stays Generated as a suggestion. It is never written as a fact by Sophia and never silently promoted to
  Asserted.

- **Acceptance writes a new Asserted operation.** When a human accepts a suggestion, the act compiles into a new
  operation recording an **Asserted** claim, with the original Generated item retained as provenance. The Generated item
  is never mutated in place; the lineage from suggestion to asserted fact is auditable. Rejection writes nothing.

- **Generation is grounded by retrieval (RAG).** Sophia grounds output in twin content retrieved through Lexis
  ([ADR-0012](./ADR-0012-search-and-discovery-lexis.md)) rather than free generation (Lewis et al., Retrieval-Augmented
  Generation, 2020). Grounding reduces invention and gives each suggestion traceable supporting content. A suggestion
  that cannot be grounded is surfaced as low-confidence or withheld, not presented as confident.

- **Every Sophia output carries confidence and a model card.** Generated suggestions carry a confidence band
  ([ADR-0021](./ADR-0021-confidence-and-trust-scale.md)); the producing model is documented by a model card stating
  intended use, limitations, and known failure modes (Mitchell et al., Model Cards for Model Reporting, 2019). An opaque
  generation with no provenance is not acceptable.

- **The default posture is offline/local.** Sophia runs against a local model by default, consistent with the
  offline-first posture ([ADR-0006](./ADR-0006-tauri-trust-boundary-and-typed-ipc.md)). A hosted-model adapter is a
  deployment variant governed by the host capability and the security posture, not the default. Governance, guardrails,
  and provenance follow the NIST AI Risk Management Framework (AI RMF 1.0).

- **Sophia is an engine and depends on no other engine** ([ADR-0011](./ADR-0011-module-taxonomy-and-boundaries.md)). The
  host composes Sophia with Lexis (retrieval) and Mneme (writing the Asserted operation on acceptance).

## Considered Options

- **Auto-accepting high-confidence suggestions (rejected):** convenient, but breaks the Generated-until-accepted
  invariant; high confidence is a prompt to review, not a licence to assert
  ([ADR-0021](./ADR-0021-confidence-and-trust-scale.md)).
- **Free generation without retrieval (rejected):** higher fluency, more invention; grounding in twin content is the
  discipline that keeps suggestions about the actual model.
- **Renderer-side model calls (rejected):** simpler wiring, but punctures the trust boundary and the network posture;
  the host capability keeps both intact.

## Consequences

- A worked example: Sophia suggests a `realises` relationship from an `Application` to a `Capability`, grounded in
  retrieved descriptions, at Medium confidence. It appears as a Generated suggestion `Awaiting review`. Acceptance
  writes a new Asserted operation creating the relationship with import-from-suggestion lineage; rejection leaves the
  twin unchanged.
- Generated content is always visually distinguishable from Asserted and Inferred, per the honest-state vocabulary
  ([DOCUMENTATION-STANDARD.md §9](../02-standards/DOCUMENTATION-STANDARD.md)).
- Local-model quality is bounded; this is the cost of the offline default, stated plainly.
- Sophia and Metis share the model-card obligation for any ML output.

## Follow-ups / Open Questions

- The confidence calibration method for generated suggestions and how it maps onto the §8.2 bands.
- The shape of the model-card record and where it is stored.
- Guardrail specifics (prompt-injection defence, output filtering) under the AI RMF.

## References & standards

- Lewis et al. — **Retrieval-Augmented Generation**, 2020 _(normative: grounding)_.
- Mitchell et al. — **Model Cards for Model Reporting**, 2019 _(normative: per-output disclosure)_.
- **NIST AI Risk Management Framework** (AI RMF 1.0) _(informative: governance and provenance posture)_.

## Related documents

| Document                                             | What it covers                                                 |
| ---------------------------------------------------- | -------------------------------------------------------------- |
| [`CONTEXT.md`](../../CONTEXT.md)                     | The content-classification axis (Asserted/Inferred/Generated). |
| [ADR-0012](./ADR-0012-search-and-discovery-lexis.md) | Lexis retrieval, which grounds Sophia generation.              |
| [ADR-0021](./ADR-0021-confidence-and-trust-scale.md) | The confidence scale generated suggestions carry.              |
