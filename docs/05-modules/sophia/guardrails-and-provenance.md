# Guardrails and provenance

How Sophia keeps generated content from silently becoming truth: all output Generated, acceptance writing a new Asserted operation, the LLM behind a host capability, and an offline-by-default posture. For practitioners who must trust that an AI suggestion never becomes a fact no one chose to assert.

> **PLANNED.** No `aideon_sophia` crate exists; this is design intent per [ADR-0014](../../06-adrs/ADR-0014-ai-assistance-and-generated-provenance-sophia.md).

## The risk: silent promotion

LLM assistance is valuable for drafting and enrichment and dangerous if its output is mistaken for asserted truth. The specific risk is **silent promotion** — generated text quietly becoming a fact no one chose to assert — and its companion, ungrounded generation that invents entities the twin does not contain ([ADR-0014](../../06-adrs/ADR-0014-ai-assistance-and-generated-provenance-sophia.md)). Sophia's guardrails exist to make both impossible.

## All output is Generated

Every Sophia output is classified **Generated** ([`CONTEXT.md`](../../../CONTEXT.md)) the moment it is produced. Generated is one of the three content classifications — Asserted, Inferred, Generated — and it means: produced by an LLM/ML process, a suggestion until accepted. Sophia output stays Generated; Sophia itself writes no fact ([ADR-0014](../../06-adrs/ADR-0014-ai-assistance-and-generated-provenance-sophia.md)). Generated content is always visually distinguishable from Asserted and Inferred content wherever it appears ([Documentation Standard §9](../../02-standards/DOCUMENTATION-STANDARD.md)).

## Acceptance writes a new Asserted operation — never silent promotion

Promotion from suggestion to fact is **always an explicit human act**. When a human accepts a suggestion, the act compiles into a **new operation** recording an **Asserted** claim ([`CONTEXT.md`](../../../CONTEXT.md)). Three properties hold ([ADR-0014](../../06-adrs/ADR-0014-ai-assistance-and-generated-provenance-sophia.md)):

- The original Generated item is **retained as provenance**, never mutated in place — the lineage from suggestion to asserted fact is auditable.
- **Rejection writes nothing** — the twin is unchanged.
- There is **no auto-acceptance**, even at high confidence. High confidence is a prompt to review, not a licence to assert ([ADR-0021](../../06-adrs/ADR-0021-confidence-and-trust-scale.md)); auto-accepting high-confidence suggestions is rejected because it breaks the Generated-until-accepted invariant ([ADR-0014](../../06-adrs/ADR-0014-ai-assistance-and-generated-provenance-sophia.md)).

This is the load-bearing trust commitment: relaxing it would silently change the meaning of the model, which is why it is surfaced everywhere generated content appears.

## Behind a host capability

The LLM sits **behind a host capability, not in the renderer** ([ADR-0014](../../06-adrs/ADR-0014-ai-assistance-and-generated-provenance-sophia.md)). Sophia is invoked through the typed IPC seam ([ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)); the renderer never calls a model directly and never holds model credentials. The trade-off named: renderer-side model calls are simpler to wire, but they puncture the trust boundary and the network posture; the host capability keeps both intact ([ADR-0014](../../06-adrs/ADR-0014-ai-assistance-and-generated-provenance-sophia.md)).

## Offline posture and the AI RMF

The default posture is **offline/local**: Sophia runs against a local model by default, consistent with the offline-first posture ([ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)). A hosted-model adapter is a deployment variant governed by the host capability and the security posture, not the default. The cost is stated plainly: local-model quality is bounded ([ADR-0014](../../06-adrs/ADR-0014-ai-assistance-and-generated-provenance-sophia.md)). Governance, guardrails, and provenance follow the **NIST AI Risk Management Framework** (AI RMF 1.0); the guardrail specifics — prompt-injection defence, output filtering — are an open question under that framework.

## Worked example

Sophia suggests a `realises` relationship from the seed `Application` `n:application:journey-studio` to the `Capability` `n:capability:journey-orchestration`, grounded in retrieved descriptions, at **Medium** confidence ([ADR-0021](../../06-adrs/ADR-0021-confidence-and-trust-scale.md)). It appears as a Generated suggestion `Awaiting review`, visually distinct from the surrounding Asserted facts. If the steward accepts, a new operation writes an **Asserted** `realises` relationship with import-from-suggestion lineage, the original suggestion retained as provenance. If the steward rejects, the twin is unchanged. At no point does the suggestion become a fact without that human act ([ADR-0014](../../06-adrs/ADR-0014-ai-assistance-and-generated-provenance-sophia.md)).

## References & standards

_Informative:_

- **NIST AI Risk Management Framework** (AI RMF 1.0). The governance and provenance posture.

Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                                            | What it covers                                                  |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| [Sophia README](./README.md)                                                        | The module index and invariants.                                |
| [Grounding and retrieval](./grounding-and-retrieval.md)                             | Why grounding reduces invention.                                |
| [Model cards](./model-cards.md)                                                     | The disclosure each output carries.                             |
| [`CONTEXT.md`](../../../CONTEXT.md)                                                 | The Asserted / Inferred / Generated classification.             |
| [ADR-0014](../../06-adrs/ADR-0014-ai-assistance-and-generated-provenance-sophia.md) | The decision that fixes the Generated-until-accepted invariant. |
