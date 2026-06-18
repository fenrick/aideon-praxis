# Data access and scope

What data Sophia may read, what may leave the device, and where its derived artefacts live. For practitioners who must answer "does the AI see PII, and could it exfiltrate the model?" before turning Sophia on.

> **PLANNED.** No `aideon_sophia` crate exists; this is design intent per [ADR-0014](../../06-adrs/ADR-0014-ai-assistance-and-generated-provenance-sophia.md).

## Sophia reads only what the request's viewpoint already resolves

Sophia does not browse the twin. It reads only the bounded, viewpoint-aware context the host composes into a generation request through [Lexis](../lexis/README.md) ([grounding and retrieval](./grounding-and-retrieval.md)). That grounding inherits the requester's [viewpoint](../../../CONTEXT.md) — as-of valid time, as-of asserted time, layer, scenario, and scope — so Sophia never grounds on entities that do not exist at the reader's as-of time, in an unselected scenario, or in a layer the reader is not viewing ([Lexis viewpoint-aware search](../lexis/viewpoint-aware-search.md)).

This bounds the data-access question to a single rule: **Sophia sees what the requester's viewpoint already resolves, and nothing else.** The model is never given a privileged or wider slice than the human who asked. A suggestion is therefore reasoned from the same facts the requester could read directly, which is also the property that makes leak-prevention tractable ([approval and audit](./approval-and-audit.md)).

## PII reaches the model only when the requester's view already exposes it

Sophia carries no separate PII exemption. Personally identifiable fields are defined by [pii-and-export-redaction.md](../../02-standards/security/pii-and-export-redaction.md): display names, email addresses, free-text notes, device identifiers, and any slot tagged `pii: true` in the workspace schema ([CONTRACTS-AND-SCHEMAS.md](../../04-contracts/CONTRACTS-AND-SCHEMAS.md)).

Two rules apply to the grounding context the host builds:

- For a **local model** (the default, below), the grounding context stays on the device, so the PII boundary that matters is the requester's viewpoint: the model may be grounded on a `pii: true` slot only when the requester's view already resolves it. PII is not redacted from local-model grounding, because nothing leaves the device — but it is still scoped to the requester's view, not the whole twin.
- For a **hosted model**, the grounding context crosses the egress boundary below, so it routes through the **same deny-by-default redaction** as any export before it leaves the device. The redaction layer treats every `pii: true` slot, and the always-on PII floor, as data that must be stripped or excluded before transmission ([pii-and-export-redaction.md](../../02-standards/security/pii-and-export-redaction.md)).

The trade-off named: redacting PII out of hosted-model grounding lowers suggestion quality for any task that needs personal data (drafting an owner-aware description, for example); the alternative — shipping PII to a third party — is rejected, because the export redaction posture is deny-by-default and a hosted model is an export surface, not an exception to it.

## The egress boundary: what may leave the device

Sophia sits behind a host capability, never in the renderer ([guardrails and provenance](./guardrails-and-provenance.md)), so the host owns the network posture for every model call ([ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)). The egress boundary follows the model location:

| Model location             | What leaves the device                                                                   | Posture                                                                                                                   |
| -------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Local model** (default)  | Nothing. Prompt, grounding context, and response stay on the device.                     | Consistent with the offline-first default ([ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)).     |
| **Hosted model** (variant) | The composed prompt — instruction, retrieved grounding (PII-redacted), and the response. | Egress crosses the trust boundary; governed by the host capability allowlist ([model management](./model-management.md)). |

In desktop mode the baseline forbids renderer HTTP and any open local TCP port ([security-constraints.md](../../01-architecture/boundary/security-constraints.md)); a hosted-model call is a host-originated outbound request to an allowlisted endpoint, not a port the renderer can reach. A hosted model is therefore a deliberate, configured egress, recorded as such — never an implicit one.

## Embeddings are derived and rebuildable, not a second canonical store

Sophia does not own an embedding store. The vector index that retrieval rides on is a [Lexis](../lexis/full-text-and-semantic.md) concern, and it is **derived material**: by the deciding rule of the boundary, anything rebuildable from the canonical files is derived ([canonical-vs-derived](../../01-architecture/boundary/canonical-vs-derived.md)). Search and vector sidecars are listed there as Derived, alongside the runtime database.

Two consequences follow. First, embeddings carry no authority — they are an index over canonical facts, not a fact, and deleting them loses nothing that cannot be rebuilt from the op log. Second, embeddings are an information-disclosure surface even though they are derived: a vector reconstructed from a `pii: true` slot still encodes that slot's content, so the embedding sidecar inherits the confidentiality of its source and is protected at rest with the workspace, not shipped in an export ([pii-and-export-redaction.md](../../02-standards/security/pii-and-export-redaction.md)). The embedding model itself is disclosed by a model card like any other ML component ([model cards](./model-cards.md), [Lexis full-text and semantic](../lexis/full-text-and-semantic.md)).

## Data residency follows the model location

Residency is a direct consequence of the egress boundary. With the **local model** default, all Sophia data — prompt, grounding, response, and the embedding sidecar — resides on the device, in the workspace and its derived runtime; there is no off-device residency question to answer. With a **hosted model**, the only data that leaves the device is the redacted prompt and the response, and its residency is the hosted endpoint's residency, which is a property of the allowlisted endpoint the deployment configures ([model management](./model-management.md)). The product makes no claim about a hosted provider's residency beyond what the configured endpoint guarantees; choosing a hosted model is choosing its residency, and that choice is recorded.

## Worked example

A steward at viewpoint as-of valid time `2026-06-11`, layer `actual`, base case asks Sophia to draft a description for the seed `Application` `n:application:journey-studio`. The host issues a Lexis retrieval at that viewpoint, which returns `n:application:journey-studio` and the nearby `Capability` `n:capability:journey-orchestration` — and **not** a capability that exists only in an unselected scenario, because the retrieval is viewpoint-aware.

- With the **local model** default, the grounding (including the application's `owner` display name, a PII field) stays on the device; Sophia drafts the description from it, and nothing is transmitted.
- Had the deployment configured a **hosted model**, the host would strip the `owner` name through the export redaction layer before the prompt left the device; the hosted model would draft from the redacted grounding, and the residency of that prompt would be the configured endpoint's.

Either way the suggestion is Generated, `Awaiting review`, and reasoned only from facts the steward's own viewpoint resolves ([guardrails and provenance](./guardrails-and-provenance.md)).

## References & standards

_Normative:_

- **OWASP ASVS 5.0** — V7 (privacy / data protection). The redaction posture a hosted-model egress inherits ([pii-and-export-redaction.md](../../02-standards/security/pii-and-export-redaction.md)).

_Informative:_

- **NIST AI Risk Management Framework** (AI RMF 1.0). The governance posture for data access to a generative model.

Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                                               | What it covers                                                 |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| [Sophia README](./README.md)                                                           | The module index and invariants.                               |
| [Grounding and retrieval](./grounding-and-retrieval.md)                                | How viewpoint-aware retrieval bounds what Sophia reads.        |
| [Model management](./model-management.md)                                              | Local vs hosted selection and the allowlist that gates egress. |
| [pii-and-export-redaction.md](../../02-standards/security/pii-and-export-redaction.md) | The PII classes and deny-by-default redaction.                 |
| [Canonical vs derived](../../01-architecture/boundary/canonical-vs-derived.md)         | Why embeddings are derived and rebuildable.                    |
| [ADR-0014](../../06-adrs/ADR-0014-ai-assistance-and-generated-provenance-sophia.md)    | The decision that fixes Sophia's boundary and offline default. |
